import * as dotenv from 'dotenv';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { verify } from '../utils/utils';

dotenv.config();

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const header = {
    slot: '5211007', // period 636
    proposerIndex: '244391',
    parentRoot: '0x675470c38e0a74f5cf147529a683323c372699a8d8f493a7540afbe3ee823df7',
    stateRoot: '0xec81ad00910a457dad9fcea92130db7054ba50371a8e6813643b974d315ee2d8',
    bodyRoot: '0x8f929507493ec582e9de84159018eb40a06389007a6af3b06b3dd48eb7a28534'
  };

  const zkVerifier = await deployments.get('ZkVerifier');

  const args = [
    1616508000,
    '0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb',
    [0, 36660, 112260, 162304],
    ['0x00001020', '0x01001020', '0x02001020', '0x03001020'],
    header,
    '0x28bfcd34b4a658a55a6fecf00126c9a3f7e468bbf76ac08af1472016c9903a81', // period 636 sha root
    '0x1d997dff5d143d9860a9f72dc7ee01faa0bc3a335d88749668d0d80b770e8643', // period 636 poseidon root
    zkVerifier.address
  ];

  const deployment = await deploy('EthereumLightClient', {
    from: deployer,
    log: true,
    args: args
  });
  await verify(hre, deployment, args);
};

deployFunc.tags = ['EthereumLightClient'];
deployFunc.dependencies = [];
export default deployFunc;
