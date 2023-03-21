import { expect } from 'chai';
import { zeroPad } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { EXECUTION_STATE_PROOF_638 } from './data';
import { lightClientFixture, LightClientFixture, loadFixture } from './fixture';
import { getSyncCommitteeRoot, getSyncPeriodBySlot, newLightClientUpdate } from './helper';
import proof638 from './proof_638.json';
import update637 from './update_637.json';
import update638 from './update_638.json';

let f: LightClientFixture;

describe('processLightClientUpdate()', () => {
  beforeEach(async () => {
    f = await loadFixture(lightClientFixture);
  });

  it('rejects update if finality proof is invalid', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);

    update.finalityBranch = update.finalityBranch.slice(1, -1);
    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('bad fin proof');

    update.finalityBranch = [];
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no fin proof');
  });

  it('rejects update if execution state proof is invalid', async () => {
    const [admin] = await ethers.getSigners();

    let update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.finalizedHeader.executionStateRootBranch = [];
    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no exec fin proof');

    update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.finalizedHeader.executionStateRoot = zeroPad('0x01', 32);
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('bad exec fin proof');
  });

  it('rejects update if committee root mapping proof is invalid', async () => {
    const [admin] = await ethers.getSigners();
    const root = getSyncCommitteeRoot(
      getUpdate638().data.next_sync_committee.pubkeys,
      getUpdate638().data.next_sync_committee.aggregate_pubkey
    );
    let update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.nextSyncCommitteeRootMappingProof.a[0] = '0x0';
    let tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).reverted;

    update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.nextSyncCommitteeRoot = zeroPad('0x01', 32); // wrong root
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('bad next sync committee proof');

    update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.nextSyncCommitteeRoot = root;
    update.nextSyncCommitteeBranch = [zeroPad('0x01', 32)]; // wrong proof
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('bad next sync committee proof');

    update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.nextSyncCommitteeBranch = [];
    tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('no next sync committee proof');
  });

  it("rejects update if the updates sig poseidon root doesn't match light client's poseidon root", async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    update.syncAggregate.poseidonRoot = zeroPad('0x01', 32);
    const tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).to.be.revertedWith('bad poseidon root');
  });

  it('rejects update if sig proof is invalid', async () => {
    const [admin] = await ethers.getSigners();
    let update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);

    update.syncAggregate.proof.a[0] = '0x0';
    const tx = f.lightClient.connect(admin).processLightClientUpdate(update);
    await expect(tx).reverted;
  });

  it('processes update', async () => {
    const [admin] = await ethers.getSigners();
    const update = newLightClientUpdate(getUpdate638().data, proof638, EXECUTION_STATE_PROOF_638);
    const tx = await f.lightClient.connect(admin).processLightClientUpdate(update);
    const b = getUpdate638().data.finalized_header.beacon;

    // check if finalized header is updated correctly
    await expect(tx)
      .to.emit(f.lightClient, 'HeaderUpdated')
      .withArgs(b.slot, b.state_root, getUpdate638().data.finalized_header.execution.state_root, true);
    const root639 = getSyncCommitteeRoot(
      getUpdate638().data.next_sync_committee.pubkeys,
      getUpdate638().data.next_sync_committee.aggregate_pubkey
    );

    const h = await f.lightClient.connect(admin).finalizedHeader();
    expect(h.slot).equals(b.slot);
    expect(h.stateRoot).equals(b.state_root);
    const res = await f.lightClient.connect(admin).finalizedExecutionStateRootAndSlot();
    expect(res.root).equals(getUpdate638().data.finalized_header.execution.state_root);
    expect(res.slot).equals(getUpdate638().data.finalized_header.beacon.slot);

    // check if committee is updated correctly
    await expect(tx)
      .to.emit(f.lightClient, 'SyncCommitteeUpdated')
      .withArgs(
        getSyncPeriodBySlot(parseInt(getUpdate638().data.attested_header.beacon.slot)),
        root639,
        update.nextSyncCommitteePoseidonRoot
      );
    const { currentRoot, nextRoot } = await f.lightClient.connect(admin).latestFinalizedSlotAndCommitteeRoots();
    const root638 = getSyncCommitteeRoot(
      update637.data.next_sync_committee.pubkeys,
      update637.data.next_sync_committee.aggregate_pubkey
    );
    expect(currentRoot).equal(root638);
    expect(nextRoot).equal(root639);
  });
});

function getUpdate638() {
  return copy(update638);
}

function copy<T>(o: T): T {
  const j = JSON.stringify(o);
  return JSON.parse(j);
}
