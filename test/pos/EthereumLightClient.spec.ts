import { expect } from 'chai';
import { zeroPad } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { FAKE_POSEIDON_ROOT_707 } from './data';
import update5788608 from './finality_update_706_5788608.json';
import updatePeriod706 from './finality_update_period_706.json';
import { lightClientFixture, LightClientFixture, loadFixture } from './fixture';
import {
  getSyncCommitteeRoot,
  getSyncPeriodBySlot,
  newLightClientFinalityUpdate,
  newLightClientUpdate,
  newSyncCommitteeUpdate,
  ZERO_BYTES_32
} from './helper';

let f: LightClientFixture;

// describe('computeSigningRoot()', () => {
//   beforeEach(async () => {
//     f = await loadFixture(lightClientFixture);
//   });
//   const block = {
//     slot: '5077296',
//     proposer_index: '59489',
//     parent_root: '0x82a5a23dc1038434376c626fe94e3485d8c97ca9ecaab2bf655896db02f56074',
//     state_root: '0x290a021645890c8394c07351edccfcf65fdb9889d75039bf9bb944cbcb4efcf6',
//     body_root: '0xa922807e2fb108681b300ae05fd25d08c6fff559e5d1fecf420dbbe0b2a8b857'
//   };
//   it('computes correct domain', async () => {
//     const [admin] = await ethers.getSigners();
//     let tx = f.lightClient.connect(admin).computeDomain();

//   });
//   it('computes correct signing root', async () => {
//     const [admin] = await ethers.getSigners();
//     const update = newLightClientUpdate(update5788608);
//   });
// });

describe('processLightClientUpdate()', () => {
  beforeEach(async () => {
    f = await loadFixture(lightClientFixture);
  });

  it('checks committee participation', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(update5788608);

    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.not.be.revertedWith('not enough committee participation');

    update.syncAggregate.participation = 0;
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('not enough committee participation');
  });

  it('checks finality proof', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(update5788608);

    update.finalityBranch = update.finalityBranch.slice(1, -1);
    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('invalid finality proof');

    update.finalityBranch = [];
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no finality proof');
  });

  it('checks execution state root proof', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(update5788608, {
      finalizedExecutionStateRoot: zeroPad('0x01', 32)
    });

    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no execution finality proof');

    update.finalizedExecutionStateRootBranch = [zeroPad('0x01', 32)];
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('invalid execution finality proof');
  });

  it('checks sync committee proof', async () => {
    const [admin] = await ethers.getSigners();
    const root = getSyncCommitteeRoot(
      updatePeriod706.next_sync_committee.pubkeys,
      updatePeriod706.next_sync_committee.aggregate_pubkey
    );
    const update = newLightClientUpdate(updatePeriod706, {
      nextSyncCommitteeRoot: root,
      nextSyncCommitteePoseidonRoot: FAKE_POSEIDON_ROOT_707,
      nextSyncCommitteeBranch: updatePeriod706.finality_branch
    });

    // TODO: replace with invalid mapping proof
    // update.nextSyncCommitteeRootMappingProof = { placeholder: ZERO_BYTES_32 };
    // let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    // await expect(tx).to.be.revertedWith('invalid next sync committee root mapping proof');

    update.nextSyncCommitteeRoot = zeroPad('0x01', 32); // wrong root
    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('invalid next sync committee proof');

    update.nextSyncCommitteeRoot = root;
    update.nextSyncCommitteeBranch = [zeroPad('0x01', 32)]; // wrong proof
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('invalid next sync committee proof');

    update.nextSyncCommitteeBranch = [];
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no next sync committee proof');
  });

  it('checks poseidon root', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(update5788608, { poseidonRoot: ZERO_BYTES_32 });

    const tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('invalid committee poseidon root');
  });

  it('checks sig proof', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(update5788608, {
      sigProof: { placeholder: ZERO_BYTES_32 } // TODO: replace with real proof
    });

    const tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).not.reverted;

    // TODO: invalid proof test
    // update.syncAggregate.proof = { placeholder: ZERO_BYTES_32 };
    // tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    // await expect(tx).revertedWith('invalid bls sig proof');
  });

  it('processes finality update', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientFinalityUpdate(update5788608);

    const tx = await f.lightClient.connect(admin).processLightClientFinalityUpdate(update);
    const b = update5788608.finalized_header.beacon;
    expect(tx).to.emit(f.lightClient, 'HeaderUpdated').withArgs(b.slot, b.state_root, ZERO_BYTES_32, true);
    const h = await f.lightClient.connect(admin).finalizedHeader();
    expect(h.slot).equals(b.slot);
    expect(h.stateRoot).equals(b.state_root);
    const exec = await f.lightClient.connect(admin).finalizedExecutionStateRootAndSlot();
    expect(exec.root).equals(ZERO_BYTES_32); // TODO: replace with real execution state root
    expect(exec.slot).equals(0); // TODO: replace with real execution state root slot
  });

  it('updates sync committee', async () => {
    const [admin] = await ethers.getSigners();
    const sszRoot = getSyncCommitteeRoot(
      updatePeriod706.next_sync_committee.pubkeys,
      updatePeriod706.next_sync_committee.aggregate_pubkey
    );
    const poseidonRoot = FAKE_POSEIDON_ROOT_707;
    const update = newSyncCommitteeUpdate(updatePeriod706, sszRoot, poseidonRoot, {
      placeholder: ZERO_BYTES_32 // TODO replace with real proof
    });
    const tx = await f.lightClient.connect(admin).processSyncCommitteeUpdate(update);
    const expectedPeriod = getSyncPeriodBySlot(parseInt(updatePeriod706.finalized_header.beacon.slot)) + 1;
    expect(tx).to.emit(f.lightClient, 'SyncCommitteeUpdated').withArgs(expectedPeriod, sszRoot, poseidonRoot);
  });
});
