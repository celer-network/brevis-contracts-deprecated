import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { TokenVault } from '../typechain/TokenVault';

dotenv.config();

const bridges = [
  { chainId: 97, addr: '0x117b7EDf95bDa7Cbe9fbeEa9eF1b974b522c29e9' },
  { chainId: 43113, addr: '0x573578638aC0C564aabe2926dbe23BC496c1A97F' }
];

const init = async () => {
  const [signer] = await ethers.getSigners();
  const vault = await (await ethers.getContract<TokenVault>('TokenVault')).connect(signer);
  for (const b of bridges) {
    const tx = await vault.setRemotePegBridge(b.chainId, b.addr);
    console.log(`setRemotePegBridge(${b.chainId}, ${b.addr}) tx:`, tx.hash);
    await tx.wait();
  }
};

init();
