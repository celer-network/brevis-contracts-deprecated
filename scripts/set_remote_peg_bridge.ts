import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { TokenVault } from '../typechain/TokenVault';

dotenv.config();

const remotePegBridge = process.env.REMOTE_PEG_BRIDGE as string;

const init = async () => {
  const [signer] = await ethers.getSigners();
  const vault = await (await ethers.getContract<TokenVault>('TokenVault')).connect(signer);
  console.log(`initializing TokenVault with remotePegBridge ${remotePegBridge}`);
  const tx = await vault.setRemotePegBridge(remotePegBridge);
  await tx.wait();
  console.log('setRemotePegBridge() tx:', tx.hash);
};

init();
