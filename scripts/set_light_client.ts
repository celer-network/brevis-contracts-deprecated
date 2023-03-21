import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { MessageBridge } from '../typechain';

dotenv.config();

const lightclient = process.env.LIGHT_CLIENT as string;

const init = async () => {
  const [signer] = await ethers.getSigners();
  const msgbr = await (await ethers.getContract<MessageBridge>('MessageBridge')).connect(signer);
  console.log(`setting MessageBridge with light client address ${lightclient}`);
  const tx = await msgbr.setLightClient(lightclient);
  await tx.wait();
  console.log('setLightClient() tx:', tx.hash);
};

init();
