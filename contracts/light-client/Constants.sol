// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

// light client security params
uint256 constant MIN_SYNC_COMMITTEE_PARTICIPANTS = 1;
uint256 constant UPDATE_TIMEOUT = 86400;

// beacon chain constants
uint256 constant FINALIZED_ROOT_INDEX = 105;
uint256 constant NEXT_SYNC_COMMITTEE_INDEX = 55;
// https://github.com/ethereum/consensus-specs/blob/dev/specs/capella/light-client/sync-protocol.md
// bodyRoot -> executionRoot -> stateRoot
// bodyRoot to executionRoot is 4 layers, executionRoot to stateRoot is 4 layers, executionRoot is is at gindex 25 from bodyRoot
// so to get stateRoot's gindex:
// 2 << 7 | 9 * 2 << 3 | 2 = 402
uint256 constant EXECUTION_STATE_ROOT_INDEX = 402;
uint256 constant SYNC_COMMITTEE_SIZE = 512;
uint64 constant SLOTS_PER_EPOCH = 32;
uint64 constant EPOCHS_PER_SYNC_COMMITTEE_PERIOD = 256;
bytes32 constant DOMAIN_SYNC_COMMITTEE = bytes32(uint256(0x07) << 248);
uint256 constant SLOT_LENGTH_SECONDS = 12;
