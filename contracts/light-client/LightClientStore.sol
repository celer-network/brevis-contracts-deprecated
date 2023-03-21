// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

import "./Types.sol";
import "./IZkVerifier.sol";

abstract contract LightClientStore {
    // beacon chain genesis information
    uint256 immutable GENESIS_TIME;
    bytes32 immutable GENESIS_VALIDATOR_ROOT;

    // light client store
    BeaconBlockHeader public finalizedHeader;
    bytes32 public finalizedExecutionStateRoot;
    uint64 public finalizedExecutionStateRootSlot;

    bytes32 public currentSyncCommitteeRoot;
    bytes32 public currentSyncCommitteePoseidonRoot;
    bytes32 public nextSyncCommitteeRoot;
    bytes32 public nextSyncCommitteePoseidonRoot;

    LightClientUpdate public bestValidUpdate;

    // fork versions
    uint64[] public forkEpochs;
    bytes4[] public forkVersions;

    // zk verifier
    IZkVerifier public zkVerifier; // contract too big. need to move this one out

    constructor(
        uint256 genesisTime,
        bytes32 genesisValidatorsRoot,
        uint64[] memory _forkEpochs,
        bytes4[] memory _forkVersions,
        BeaconBlockHeader memory _finalizedHeader,
        bytes32 syncCommitteeRoot,
        bytes32 syncCommitteePoseidonRoot,
        address _zkVerifier
    ) {
        GENESIS_TIME = genesisTime;
        GENESIS_VALIDATOR_ROOT = genesisValidatorsRoot;
        forkEpochs = _forkEpochs;
        forkVersions = _forkVersions;
        finalizedHeader = _finalizedHeader;
        currentSyncCommitteeRoot = syncCommitteeRoot;
        currentSyncCommitteePoseidonRoot = syncCommitteePoseidonRoot;
        zkVerifier = IZkVerifier(_zkVerifier);
    }
}
