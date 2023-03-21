// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

struct LightClientUpdate {
    // Header attested to by the sync committee
    HeaderWithExecution attestedHeader;
    HeaderWithExecution finalizedHeader;
    // merkle branch from finalized beacon header root to attestedHeader.stateRoot
    bytes32[] finalityBranch;
    bytes32 nextSyncCommitteeRoot;
    bytes32[] nextSyncCommitteeBranch;
    bytes32 nextSyncCommitteePoseidonRoot;
    Proof nextSyncCommitteeRootMappingProof;
    // Sync committee aggregate signature participation & zk proof
    SyncAggregate syncAggregate;
    // Slot at which the aggregate signature was created (untrusted)
    uint64 signatureSlot;
}

struct HeaderWithExecution {
    BeaconBlockHeader beacon;
    bytes32 executionStateRoot;
    // merkle branch from execution state root to beacon block body root
    // note: this is a concatenation of the light client spec's "execution_branch" which is from
    // execution payload root to beacon block body root
    bytes32[] executionStateRootBranch;
}

struct BeaconBlockHeader {
    uint64 slot;
    uint64 proposerIndex;
    bytes32 parentRoot;
    bytes32 stateRoot;
    bytes32 bodyRoot;
}

struct SyncAggregate {
    uint64 participation;
    bytes32 poseidonRoot;
    uint256 commitment;
    Proof proof;
}

struct Proof {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[2] commitment;
}
