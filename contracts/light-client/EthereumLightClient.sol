// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IEthereumLightClient.sol";

import "./IZkVerifier.sol";
import "./LightClientStore.sol";
import "./SSZ.sol";
import "./Constants.sol";
import "./Types.sol";

import "hardhat/console.sol";

contract EthereumLightClient is IEthereumLightClient, LightClientStore, Ownable {
    event HeaderUpdated(uint256 slot, bytes32 stateRoot, bytes32 executionStateRoot, bool finalized);
    event SyncCommitteeUpdated(uint256 period, bytes32 sszRoot, bytes32 poseidonRoot);
    event ForkVersionUpdated(uint64 epoch, bytes4 forkVersion);

    constructor(
        uint256 genesisTime,
        bytes32 genesisValidatorsRoot,
        uint64[] memory _forkEpochs,
        bytes4[] memory _forkVersions,
        BeaconBlockHeader memory _finalizedHeader,
        bytes32 syncCommitteeRoot,
        bytes32 syncCommitteePoseidonRoot,
        address _zkVerifier
    )
        LightClientStore(
            genesisTime,
            genesisValidatorsRoot,
            _forkEpochs,
            _forkVersions,
            _finalizedHeader,
            syncCommitteeRoot,
            syncCommitteePoseidonRoot,
            _zkVerifier
        )
    {}

    function latestFinalizedSlotAndCommitteeRoots()
        external
        view
        returns (uint64 slot, bytes32 currentRoot, bytes32 nextRoot)
    {
        return (finalizedHeader.slot, currentSyncCommitteeRoot, nextSyncCommitteeRoot);
    }

    function finalizedExecutionStateRootAndSlot() external view returns (bytes32 root, uint64 slot) {
        return (finalizedExecutionStateRoot, finalizedExecutionStateRootSlot);
    }

    function updateForkVersion(uint64 epoch, bytes4 forkVersion) external onlyOwner {
        require(forkVersion != bytes4(0), "bad fork version");
        forkEpochs.push(epoch);
        forkVersions.push(forkVersion);
        emit ForkVersionUpdated(epoch, forkVersion);
    }

    function processLightClientForceUpdate() external onlyOwner {
        require(currentSlot() > finalizedHeader.slot + UPDATE_TIMEOUT, "timeout not passed");
        require(bestValidUpdate.attestedHeader.beacon.slot > 0, "no best valid update");

        // Forced best update when the update timeout has elapsed.
        // Because the apply logic waits for finalizedHeader.beacon.slot to indicate sync committee fin,
        // the attestedHeader may be treated as finalizedHeader in extended periods of non-fin
        // to guarantee progression into later sync committee periods according to isBetterUpdate().
        if (bestValidUpdate.finalizedHeader.beacon.slot <= finalizedHeader.slot) {
            bestValidUpdate.finalizedHeader = bestValidUpdate.attestedHeader;
        }
        applyLightClientUpdate(bestValidUpdate);
        delete bestValidUpdate;
    }

    function processLightClientUpdate(LightClientUpdate memory update) public {
        validateLightClientUpdate(update);

        // Update the best update in case we have to force-update to it if the timeout elapses
        if (isBetterUpdate(update, bestValidUpdate)) {
            bestValidUpdate = update;
        }

        // Apply fin update
        bool updateHasFinalizedNextSyncCommittee = hasNextSyncCommitteeProof(update) &&
            hasFinalityProof(update) &&
            computeSyncCommitteePeriodAtSlot(update.finalizedHeader.beacon.slot) ==
            computeSyncCommitteePeriodAtSlot(update.attestedHeader.beacon.slot) &&
            nextSyncCommitteeRoot == bytes32(0);
        if (
            hasSupermajority(update.syncAggregate.participation) &&
            (update.finalizedHeader.beacon.slot > finalizedHeader.slot || updateHasFinalizedNextSyncCommittee)
        ) {
            applyLightClientUpdate(update);
            delete bestValidUpdate;
        }
    }

    function validateLightClientUpdate(LightClientUpdate memory update) private view {
        // Verify sync committee has sufficient participants
        require(update.syncAggregate.participation > MIN_SYNC_COMMITTEE_PARTICIPANTS, "not enough participation");
        // Verify update does not skip a sync committee period
        require(
            currentSlot() > update.attestedHeader.beacon.slot &&
                update.attestedHeader.beacon.slot > update.finalizedHeader.beacon.slot,
            "bad slot"
        );
        uint64 storePeriod = computeSyncCommitteePeriodAtSlot(finalizedHeader.slot);
        uint64 updatePeriod = computeSyncCommitteePeriodAtSlot(update.finalizedHeader.beacon.slot);
        require(updatePeriod == storePeriod || updatePeriod == storePeriod + 1);

        // Verify update is relavant
        uint64 updateAttestedPeriod = computeSyncCommitteePeriodAtSlot(update.attestedHeader.beacon.slot);
        bool updateHasNextSyncCommittee = nextSyncCommitteeRoot == bytes32(0) &&
            hasNextSyncCommitteeProof(update) &&
            updateAttestedPeriod == storePeriod;
        // since sync committee update prefers older header (see isBetterUpdate), an update either
        // needs to have a newer header or it should have sync committee update.
        require(update.attestedHeader.beacon.slot > finalizedHeader.slot || updateHasNextSyncCommittee);

        // Verify that the finalityBranch, if present, confirms finalizedHeader
        // to match the finalized checkpoint root saved in the state of attestedHeader.
        // Note that the genesis finalized checkpoint root is represented as a zero hash.
        if (!hasFinalityProof(update)) {
            require(isEmptyHeader(update.finalizedHeader), "no fin proof");
        } else {
            // genesis block header
            if (update.finalizedHeader.beacon.slot == 0) {
                require(isEmptyHeader(update.finalizedHeader), "genesis header should be empty");
            } else {
                bool isValidFinalityProof = SSZ.isValidMerkleBranch(
                    SSZ.hashTreeRoot(update.finalizedHeader.beacon),
                    update.finalityBranch,
                    FINALIZED_ROOT_INDEX,
                    update.attestedHeader.beacon.stateRoot
                );
                require(isValidFinalityProof, "bad fin proof");
            }
        }

        // Verify finalizedExecutionStateRoot
        if (!hasFinalizedExecutionProof(update)) {
            require(update.finalizedHeader.executionStateRoot == bytes32(0), "no exec fin proof");
        } else {
            require(hasFinalityProof(update), "no exec fin proof");
            bool isValidFinalizedExecutionRootProof = SSZ.isValidMerkleBranch(
                update.finalizedHeader.executionStateRoot,
                update.finalizedHeader.executionStateRootBranch,
                EXECUTION_STATE_ROOT_INDEX,
                update.finalizedHeader.beacon.bodyRoot
            );
            require(isValidFinalizedExecutionRootProof, "bad exec fin proof");
        }

        // Verify that the update's nextSyncCommittee, if present, actually is the next sync committee
        // saved in the state of the update's attested header
        if (!hasNextSyncCommitteeProof(update)) {
            require(
                update.nextSyncCommitteeRoot == bytes32(0) && update.nextSyncCommitteePoseidonRoot == bytes32(0),
                "no next sync committee proof"
            );
        } else {
            if (updateAttestedPeriod == storePeriod && nextSyncCommitteeRoot != bytes32(0)) {
                require(update.nextSyncCommitteeRoot == nextSyncCommitteeRoot, "bad next sync committee");
            }
            bool isValidSyncCommitteeProof = SSZ.isValidMerkleBranch(
                update.nextSyncCommitteeRoot,
                update.nextSyncCommitteeBranch,
                NEXT_SYNC_COMMITTEE_INDEX,
                update.attestedHeader.beacon.stateRoot
            );
            require(isValidSyncCommitteeProof, "bad next sync committee proof");
            bool isValidCommitteeRootMappingProof = zkVerifier.verifySyncCommitteeRootMappingProof(
                update.nextSyncCommitteeRoot,
                update.nextSyncCommitteePoseidonRoot,
                update.nextSyncCommitteeRootMappingProof
            );
            require(isValidCommitteeRootMappingProof, "bad next sync committee root mapping proof");
        }

        // Verify sync committee signature ZK proof
        bytes4 forkVersion = computeForkVersion(computeEpochAtSlot(update.signatureSlot));
        bytes32 domain = computeDomain(forkVersion);
        bytes32 signingRoot = computeSigningRoot(update.attestedHeader.beacon, domain);
        bytes32 activeSyncCommitteePoseidonRoot;
        if (updatePeriod == storePeriod) {
            require(currentSyncCommitteePoseidonRoot == update.syncAggregate.poseidonRoot, "bad poseidon root");
            activeSyncCommitteePoseidonRoot = currentSyncCommitteePoseidonRoot;
        } else if (updatePeriod == storePeriod + 1) {
            require(nextSyncCommitteePoseidonRoot == update.syncAggregate.poseidonRoot, "bad poseidon root");
            activeSyncCommitteePoseidonRoot = nextSyncCommitteePoseidonRoot;
        }
        require(
            zkVerifier.verifySignatureProof(
                signingRoot,
                activeSyncCommitteePoseidonRoot,
                update.syncAggregate.participation,
                update.syncAggregate.commitment,
                update.syncAggregate.proof
            ),
            "bad bls sig proof"
        );
    }

    function applyLightClientUpdate(LightClientUpdate memory update) private {
        uint64 storePeriod = computeSyncCommitteePeriodAtSlot(finalizedHeader.slot);
        uint64 updateFinalizedPeriod = computeSyncCommitteePeriodAtSlot(update.finalizedHeader.beacon.slot);
        if (nextSyncCommitteeRoot == bytes32(0)) {
            require(updateFinalizedPeriod == storePeriod, "mismatch period");
            nextSyncCommitteeRoot = update.nextSyncCommitteeRoot;
            nextSyncCommitteePoseidonRoot = update.nextSyncCommitteePoseidonRoot;
            emit SyncCommitteeUpdated(updateFinalizedPeriod + 1, nextSyncCommitteeRoot, nextSyncCommitteePoseidonRoot);
        } else if (updateFinalizedPeriod == storePeriod + 1) {
            currentSyncCommitteeRoot = nextSyncCommitteeRoot;
            currentSyncCommitteePoseidonRoot = nextSyncCommitteePoseidonRoot;
            nextSyncCommitteeRoot = update.nextSyncCommitteeRoot;
            nextSyncCommitteePoseidonRoot = update.nextSyncCommitteePoseidonRoot;
            emit SyncCommitteeUpdated(updateFinalizedPeriod + 1, nextSyncCommitteeRoot, nextSyncCommitteePoseidonRoot);
        }
        if (update.finalizedHeader.beacon.slot > finalizedHeader.slot) {
            finalizedHeader = update.finalizedHeader.beacon;
            if (update.finalizedHeader.executionStateRoot != bytes32(0)) {
                finalizedExecutionStateRoot = update.finalizedHeader.executionStateRoot;
                finalizedExecutionStateRootSlot = update.finalizedHeader.beacon.slot;
            }
            emit HeaderUpdated(
                update.finalizedHeader.beacon.slot,
                update.finalizedHeader.beacon.stateRoot,
                update.finalizedHeader.executionStateRoot,
                true
            );
        } else if (
            update.finalizedHeader.beacon.slot == finalizedHeader.slot && finalizedExecutionStateRoot == bytes32(0)
        ) {
            finalizedExecutionStateRoot = update.finalizedHeader.executionStateRoot;
            finalizedExecutionStateRootSlot = update.finalizedHeader.beacon.slot;
            emit HeaderUpdated(
                update.finalizedHeader.beacon.slot,
                update.finalizedHeader.beacon.stateRoot,
                update.finalizedHeader.executionStateRoot,
                true
            );
        }
    }

    /*
     * https://github.com/ethereum/consensus-specs/blob/dev/specs/altair/light-client/sync-protocol.md#is_better_update
     */
    function isBetterUpdate(
        LightClientUpdate memory newUpdate,
        LightClientUpdate memory oldUpdate
    ) private pure returns (bool) {
        // Old update doesn't exist
        if (oldUpdate.syncAggregate.participation == 0) {
            return newUpdate.syncAggregate.participation > 0;
        }

        // Compare supermajority (> 2/3) sync committee participation
        bool newHasSupermajority = hasSupermajority(newUpdate.syncAggregate.participation);
        bool oldHasSupermajority = hasSupermajority(oldUpdate.syncAggregate.participation);
        if (newHasSupermajority != oldHasSupermajority) {
            // the new update is a better one if new has supermajority but old doesn't
            return newHasSupermajority && !oldHasSupermajority;
        }
        if (!newHasSupermajority && newUpdate.syncAggregate.participation != oldUpdate.syncAggregate.participation) {
            // a better update is the one with higher participation when both new and old doesn't have supermajority
            return newUpdate.syncAggregate.participation > oldUpdate.syncAggregate.participation;
        }

        // Compare presence of relevant sync committee
        bool newHasSyncCommittee = hasRelavantSyncCommittee(newUpdate);
        bool oldHasSyncCommittee = hasRelavantSyncCommittee(oldUpdate);
        if (newHasSyncCommittee != oldHasSyncCommittee) {
            return newHasSyncCommittee;
        }

        // Compare indication of any fin
        bool newHasFinality = hasFinalityProof(newUpdate);
        bool oldHasFinality = hasFinalityProof(oldUpdate);
        if (newHasFinality != oldHasFinality) {
            return newHasFinality;
        }

        // Compare sync committee fin
        if (newHasFinality) {
            bool newHasCommitteeFinality = computeSyncCommitteePeriodAtSlot(newUpdate.finalizedHeader.beacon.slot) ==
                computeSyncCommitteePeriodAtSlot(newUpdate.attestedHeader.beacon.slot);
            bool oldHasCommitteeFinality = computeSyncCommitteePeriodAtSlot(oldUpdate.finalizedHeader.beacon.slot) ==
                computeSyncCommitteePeriodAtSlot(oldUpdate.attestedHeader.beacon.slot);
            if (newHasCommitteeFinality != oldHasCommitteeFinality) {
                return newHasCommitteeFinality;
            }
        }

        // Tiebreaker 1: Sync committee participation beyond supermajority
        if (newUpdate.syncAggregate.participation != oldUpdate.syncAggregate.participation) {
            return newUpdate.syncAggregate.participation > oldUpdate.syncAggregate.participation;
        }

        // Tiebreaker 2: Prefer older data (fewer changes to best)
        if (newUpdate.attestedHeader.beacon.slot != oldUpdate.attestedHeader.beacon.slot) {
            return newUpdate.attestedHeader.beacon.slot < oldUpdate.attestedHeader.beacon.slot;
        }

        return newUpdate.signatureSlot < oldUpdate.signatureSlot;
    }

    function hasRelavantSyncCommittee(LightClientUpdate memory update) private pure returns (bool) {
        return
            hasNextSyncCommitteeProof(update) &&
            computeSyncCommitteePeriodAtSlot(update.attestedHeader.beacon.slot) ==
            computeSyncCommitteePeriodAtSlot(update.signatureSlot);
    }

    function hasNextSyncCommitteeProof(LightClientUpdate memory update) private pure returns (bool) {
        return update.nextSyncCommitteeBranch.length > 0;
    }

    function hasFinalityProof(LightClientUpdate memory update) private pure returns (bool) {
        return update.finalityBranch.length > 0;
    }

    function hasFinalizedExecutionProof(LightClientUpdate memory update) private pure returns (bool) {
        return update.finalizedHeader.executionStateRootBranch.length > 0;
    }

    function hasSupermajority(uint64 participation) private pure returns (bool) {
        return participation * 3 >= SYNC_COMMITTEE_SIZE * 2;
    }

    function isEmptyHeader(HeaderWithExecution memory header) private pure returns (bool) {
        return header.beacon.stateRoot == bytes32(0);
    }

    function currentSlot() private view returns (uint64) {
        return uint64((block.timestamp - GENESIS_TIME) / SLOT_LENGTH_SECONDS);
    }

    function computeForkVersion(uint64 epoch) private view returns (bytes4) {
        for (uint256 i = forkVersions.length - 1; i >= 0; i--) {
            if (epoch >= forkEpochs[i]) {
                return forkVersions[i];
            }
        }
        revert("fork versions not set");
    }

    function computeSyncCommitteePeriodAtSlot(uint64 slot) private pure returns (uint64) {
        return computeSyncCommitteePeriod(computeEpochAtSlot(slot));
    }

    function computeEpochAtSlot(uint64 slot) private pure returns (uint64) {
        return slot / SLOTS_PER_EPOCH;
    }

    function computeSyncCommitteePeriod(uint64 epoch) private pure returns (uint64) {
        return epoch / EPOCHS_PER_SYNC_COMMITTEE_PERIOD;
    }

    /**
     * https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#compute_domain
     */
    function computeDomain(bytes4 forkVersion) public view returns (bytes32) {
        return DOMAIN_SYNC_COMMITTEE | (sha256(abi.encode(forkVersion, GENESIS_VALIDATOR_ROOT)) >> 32);
    }

    // computeDomain(forkVersion, genesisValidatorsRoot)
    function computeSigningRoot(BeaconBlockHeader memory header, bytes32 domain) public pure returns (bytes32) {
        return sha256(bytes.concat(SSZ.hashTreeRoot(header), domain));
    }
}
