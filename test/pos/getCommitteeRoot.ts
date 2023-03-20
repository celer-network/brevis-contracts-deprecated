import { ethers } from 'hardhat';
import { getSyncCommitteeRoot } from './helper';
import update618 from './update_618.json';
import update619 from './update_619.json';

const root619 = getSyncCommitteeRoot(
  update618[0].data.next_sync_committee.pubkeys,
  update618[0].data.next_sync_committee.aggregate_pubkey
);
console.log('committee 619 root', ethers.utils.hexlify(root619));

const root620 = getSyncCommitteeRoot(
  update619[0].data.next_sync_committee.pubkeys,
  update619[0].data.next_sync_committee.aggregate_pubkey
);
console.log('committee 620 root', ethers.utils.hexlify(root620));
