import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { PegBridge } from '../typechain/PegBridge';

dotenv.config();

const remoteTokenVault = process.env.REMOTE_TOKEN_VAULT as string;

const init = async () => {
  const [signer] = await ethers.getSigners();
  const bridge = await (await ethers.getContract<PegBridge>('PegBridge')).connect(signer);
  console.log(`initializing PegBridge with remoteTokenVault ${remoteTokenVault}`);
  const tx = await bridge.setRemoteTokenVault(remoteTokenVault);
  await tx.wait();
  console.log('setRemoteTokenVault() tx:', tx.hash);
};

init();
