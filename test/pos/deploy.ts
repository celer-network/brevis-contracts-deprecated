import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumLightClient__factory, ZkVerifier } from '../../typechain';
import { EthereumLightClient } from '../../typechain/EthereumLightClient';
import { ZkVerifier__factory } from './../../typechain/factories/ZkVerifier__factory';
import { POSEIDON_ROOT_638 } from './data';
import { getSyncCommitteeRoot } from './helper';
import update637 from './update_637.json';

export async function deployLightClient(admin: Wallet): Promise<EthereumLightClient> {
  const zkVerifier = await deployZkVerifier(admin);
  const factory = await ethers.getContractFactory<EthereumLightClient__factory>('EthereumLightClient');
  return factory.connect(admin).deploy(
    1616508000,
    '0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb',
    [0, 36660, 112260, 162304],
    ['0x00001020', '0x01001020', '0x02001020', '0x03001020'],
    {
      slot: '5226430',
      proposerIndex: '31873',
      parentRoot: '0x13573ab7b3df8daf94decbb673255c6c20ddba2abf17b62ec069b35397600ae2',
      stateRoot: '0x9ea44a73ceb88d125fb63c9a6a17a238a0b771faf430f1f68ea278a3204087fe',
      bodyRoot: '0xe96169b38ff2f2e9f13205989ac39b085c9435dfcfc62febea431ba4f45b8aca'
    },
    getSyncCommitteeRoot(
      update637.data.next_sync_committee.pubkeys,
      update637.data.next_sync_committee.aggregate_pubkey
    ),
    POSEIDON_ROOT_638,
    zkVerifier.address
  );
}

export async function deployZkVerifier(admin: Wallet): Promise<ZkVerifier> {
  const factory = await ethers.getContractFactory<ZkVerifier__factory>('ZkVerifier');
  return factory.connect(admin).deploy();
}
