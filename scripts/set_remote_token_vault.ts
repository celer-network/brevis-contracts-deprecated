import * as dotenv from 'dotenv';
import {ethers} from 'hardhat';
import {PegBridge} from '../typechain/PegBridge';

dotenv.config();

const init = async () => {
  const [signer] = await ethers.getSigners();
  const bridge = await (await ethers.getContract<PegBridge>('PegBridge')).connect(signer);
  const tx = await bridge.setTokenVault(5, '0xc63b5873A3dA07A34f52224aEFA27a1f7FD7AB7A');
  await tx.wait();
  console.log('setRemoteTokenVault() tx:', tx.hash);
};

init();
