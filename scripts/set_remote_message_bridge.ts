import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { MessageBridge } from '../typechain';

dotenv.config();

const remoteMessageBridge = process.env.REMOTE_MESSAGE_BRIDGE as string;

const init = async () => {
  const [signer] = await ethers.getSigners();
  const msgbr = await (await ethers.getContract<MessageBridge>('MessageBridge')).connect(signer);
  console.log(`initializing MessageBridge with remoteMessageBridge ${remoteMessageBridge}`);
  const tx = await msgbr.setRemoteMessageBridge(remoteMessageBridge);
  await tx.wait();
  console.log('initialize() tx:', tx.hash);
};

init();
