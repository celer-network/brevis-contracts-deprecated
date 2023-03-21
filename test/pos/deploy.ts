import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { EthereumLightClient__factory, ZkVerifier } from '../../typechain';
import { EthereumLightClient } from '../../typechain/EthereumLightClient';
import { ZkVerifier__factory } from './../../typechain/factories/ZkVerifier__factory';
import { FAKE_POSEIDON_ROOT_706 } from './data';
import update705FirstSlot from './finality_update_period_705.json';
import update706FirstSlot from './finality_update_period_706.json';
import { getSyncCommitteeRoot, newBeaconBlockHeader } from './helper';

export async function deployLightClient(admin: Wallet): Promise<EthereumLightClient> {
  const zkVerifier = await deployZkVerifier(admin);
  const factory = await ethers.getContractFactory<EthereumLightClient__factory>('EthereumLightClient');
  return factory
    .connect(admin)
    .deploy(
      1606824023,
      '0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95',
      [0, 74240, 144896],
      ['0x00000000', '0x01000000', '0x02000000'],
      newBeaconBlockHeader(update706FirstSlot.finalized_header),
      getSyncCommitteeRoot(
        update705FirstSlot.next_sync_committee.pubkeys,
        update705FirstSlot.next_sync_committee.aggregate_pubkey
      ),
      FAKE_POSEIDON_ROOT_706,
      zkVerifier.address
    );
}

export async function deployZkVerifier(admin: Wallet): Promise<ZkVerifier> {
  const factory = await ethers.getContractFactory<ZkVerifier__factory>('ZkVerifier');
  return factory.connect(admin).deploy();
}
