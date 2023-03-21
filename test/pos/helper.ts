import { ByteVectorType, ContainerType, VectorCompositeType } from '@chainsafe/ssz';
import dotenv from 'dotenv';
import { BigNumberish } from 'ethers';
import { arrayify } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { BeaconBlockHeaderStruct, LightClientUpdateStruct, ProofStruct } from '../../typechain/EthereumLightClient';
import { HeaderWithExecutionStruct } from './../../typechain/LightClientStore';
import proof from './proof_638.json';
import update from './update_638.json';

dotenv.config();

export const ZERO_BYTES_32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function sumCommitteeBits(bits: string): number {
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
  return ethers.utils.hexlify(root);
}

export type HeaderWithExecution = typeof update.data.attested_header;
export type BeaconBlockHeader = typeof update.data.attested_header.beacon;

export function newBeaconBlockHeader(b: BeaconBlockHeader): BeaconBlockHeaderStruct {
  return {
    bodyRoot: b.body_root,
    parentRoot: b.parent_root,
    proposerIndex: b.proposer_index,
    slot: b.slot,
    stateRoot: b.state_root
  };
}

export function newHeaderWithExecution(
  h: BeaconBlockHeader,
  execStateRoot: string,
  execStateProof: string[]
): HeaderWithExecutionStruct {
  return {
    beacon: newBeaconBlockHeader(h),
    executionStateRoot: execStateRoot,
    executionStateRootBranch: execStateProof
  };
}

type Proof = typeof proof.bls_sig_proof.proof;

type UpdateProof = typeof proof;

type LightClientUpdate = typeof update.data;

function newPoint(point: string[]): [BigNumberish, BigNumberish] {
  return [point[0], point[1]];
}

function newProof(p: Proof): ProofStruct {
  return {
    a: newPoint(p.a),
    b: [newPoint(p.b[0]), newPoint(p.b[1])],
    c: newPoint(p.c),
    commitment: newPoint(p.commitment)
  };
}

export function newLightClientUpdate(
  u: LightClientUpdate,
  p: UpdateProof,
  execStateProof: string[]
): LightClientUpdateStruct {
  return {
    attestedHeader: newHeaderWithExecution(u.attested_header.beacon, ZERO_BYTES_32, []),
    finalizedHeader: newHeaderWithExecution(
      u.finalized_header.beacon,
      u.finalized_header.execution.state_root,
      execStateProof
    ),
    finalityBranch: u.finality_branch,
    nextSyncCommitteeRoot: getSyncCommitteeRoot(u.next_sync_committee.pubkeys, u.next_sync_committee.aggregate_pubkey),
    nextSyncCommitteeBranch: u.next_sync_committee_branch,
    nextSyncCommitteePoseidonRoot: p.committee_map_proof.poseidon_ssz_root,
    nextSyncCommitteeRootMappingProof: newProof(p.committee_map_proof.proof),
    signatureSlot: u.signature_slot,
    syncAggregate: {
      participation: sumCommitteeBits(u.sync_aggregate.sync_committee_bits),
      poseidonRoot: p.bls_sig_proof.poseidon_root,
      commitment: p.bls_sig_proof.commitment_pub,
      proof: newProof(p.bls_sig_proof.proof)
    }
  };
}
