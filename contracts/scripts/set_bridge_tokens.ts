import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { PegBridge } from '../typechain/PegBridge';

dotenv.config();

const vaultTokens = process.env.VAULT_TOKENS as string;
const bridgeTokens = process.env.BRIDGE_TOKENS as string;

const init = async () => {
  const [signer] = await ethers.getSigners();
  const bridge = await (await ethers.getContract<PegBridge>('PegBridge')).connect(signer);
  console.log(`set peg bridge with vault tokens ${vaultTokens} bridge tokens ${bridgeTokens}`);
  const tx = await bridge.setBridgeTokens(vaultTokens.split(','), bridgeTokens.split(','));
  await tx.wait();
  console.log('setBridgeTokens() tx:', tx.hash);
};

init();
