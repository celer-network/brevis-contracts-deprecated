import { ByteVectorType, ContainerType, VectorCompositeType } from '@chainsafe/ssz';
import dotenv from 'dotenv';
import { BytesLike } from 'ethers';
import { arrayify } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  BeaconBlockHeaderStruct,
  LightClientFinalityUpdateStruct,
  LightClientUpdateStruct,
  ProofStruct,
  SyncCommitteeUpdateStruct
} from '../../typechain/EthereumLightClient';
import { FAKE_POSEIDON_ROOT_706 } from './data';
import update from './finality_update_706_5788384.json';
import committeeUpdate from './finality_update_period_706.json';

dotenv.config();

export const ZERO_BYTES_32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function sumCommunityBits(bits: string): number {
  return ethers.utils.arrayify(bits).reduce((acc, curr) => {
    // curr is 0~255
    let sum = 0;
    // curr.toString(2) is 00000000~11111111
    for (const digit of curr.toString(2)) {
      const d = parseInt(digit);
      sum += d;
    }
    return acc + sum;
  }, 0);
}

export function getSyncPeriodBySlot(slot: number): number {
  return Math.floor(slot / 32 / 256);
}

export function getSyncCommitteeRoot(pubkeys: string[], aggregatePubkey: string) {
  const pubkeyType = new ByteVectorType(48);
  const pubkeysType = new VectorCompositeType(pubkeyType, 512);
  const rootType = new ContainerType({
    pubkeys: pubkeysType,
    aggregatePubkey: pubkeyType
  });
  const root = rootType.hashTreeRoot({
    pubkeys: pubkeys.map((key) => arrayify(key)),
    aggregatePubkey: arrayify(aggregatePubkey)
  });
  return root;
}

export type BeaconBlockHeader = typeof update.attested_header;

export function newBeaconBlockHeader(b: BeaconBlockHeader): BeaconBlockHeaderStruct {
  return {
    bodyRoot: b.beacon.body_root,
    parentRoot: b.beacon.parent_root,
    proposerIndex: b.beacon.proposer_index,
    slot: b.beacon.slot,
    stateRoot: b.beacon.state_root
  };
}

type LightClientFinalityUpdate = typeof update;

interface ExtraUpdateFields {
  finalizedExecutionStateRoot?: BytesLike;
  finalizedExecutionStateRootBranch?: BytesLike[];
  optimisticExecutionStateRoot?: BytesLike;
  optimisticdExecutionStateRootBranch?: BytesLike[];
  nextSyncCommitteeRoot?: BytesLike;
  nextSyncCommitteeBranch?: BytesLike[];
  nextSyncCommitteePoseidonRoot?: BytesLike;
  poseidonRoot?: BytesLike;
  sigProof?: ProofStruct;
  nextSyncCommitteeRootMappingProof?: ProofStruct;
}

export function newLightClientUpdate(u: LightClientFinalityUpdate, e?: ExtraUpdateFields): LightClientUpdateStruct {
  return {
    attestedHeader: newBeaconBlockHeader(u.attested_header),
    finalizedHeader: newBeaconBlockHeader(u.finalized_header),
    finalityBranch: u.finality_branch,
    finalizedExecutionStateRoot: e?.finalizedExecutionStateRoot ?? ZERO_BYTES_32,
    finalizedExecutionStateRootBranch: e?.finalizedExecutionStateRootBranch ?? [],
    optimisticExecutionStateRoot: e?.optimisticExecutionStateRoot ?? ZERO_BYTES_32,
    optimisticdExecutionStateRootBranch: e?.optimisticdExecutionStateRootBranch ?? [],
    nextSyncCommitteeRoot: e?.nextSyncCommitteeRoot ?? ZERO_BYTES_32,
    nextSyncCommitteeBranch: e?.nextSyncCommitteeBranch ?? [],
    nextSyncCommitteePoseidonRoot: e?.nextSyncCommitteePoseidonRoot ?? ZERO_BYTES_32,
    nextSyncCommitteeRootMappingProof: e?.nextSyncCommitteeRootMappingProof ?? { placeholder: ZERO_BYTES_32 },
    signatureSlot: u.signature_slot,
    syncAggregate: {
      participation: sumCommunityBits(u.sync_aggregate.sync_committee_bits),
      poseidonRoot: e?.poseidonRoot ?? FAKE_POSEIDON_ROOT_706,
      proof: e?.sigProof ?? { placeholder: ZERO_BYTES_32 }
    }
  };
}

export function newLightClientFinalityUpdate(
  u: LightClientFinalityUpdate,
  e?: ExtraUpdateFields
): LightClientFinalityUpdateStruct {
  return {
    attestedHeader: newBeaconBlockHeader(u.attested_header),
    finalizedHeader: newBeaconBlockHeader(u.finalized_header),
    finalityBranch: u.finality_branch,
    finalizedExecutionStateRoot: e?.finalizedExecutionStateRoot ?? ZERO_BYTES_32,
    finalizedExecutionStateRootBranch: e?.finalizedExecutionStateRootBranch ?? [],
    signatureSlot: u.signature_slot,
    syncAggregate: {
      participation: sumCommunityBits(u.sync_aggregate.sync_committee_bits),
      poseidonRoot: e?.poseidonRoot ?? FAKE_POSEIDON_ROOT_706,
      proof: e?.sigProof ?? { placeholder: ZERO_BYTES_32 }
    }
  };
}

type SyncCommitteeUpdate = typeof committeeUpdate;

export function newSyncCommitteeUpdate(
  u: SyncCommitteeUpdate,
  sszRoot: Uint8Array,
  poseidonRoot: string,
  mappingProof: ProofStruct
): SyncCommitteeUpdateStruct {
  return {
    attestedHeader: newBeaconBlockHeader(u.attested_header),
    finalizedHeader: newBeaconBlockHeader(u.finalized_header),
    finalityBranch: u.finality_branch,
    nextSyncCommitteeRoot: sszRoot,
    nextSyncCommitteeBranch: u.next_sync_committee_branch,
    nextSyncCommitteePoseidonRoot: poseidonRoot,
    nextSyncCommitteeRootMappingProof: mappingProof,
    signatureSlot: u.signature_slot,
    syncAggregate: {
      participation: sumCommunityBits(u.sync_aggregate.sync_committee_bits),
      poseidonRoot: FAKE_POSEIDON_ROOT_706,
      proof: { placeholder: ZERO_BYTES_32 } // TODO: replace with real proof
    }
  };
}
