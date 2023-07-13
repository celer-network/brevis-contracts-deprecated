import * as dotenv from 'dotenv';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {verify} from '../utils/utils';

dotenv.config();

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const verifier = await deployments.get('BeaconVerifier');

  const args = [
    1606824023,
    '0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95',
    [0, 74240, 144896, 194048],
    ['0x00000000', '0x01000000', '0x02000000', '0x03000000'],
    6513843,
    '0xdfd73daafb81c19816db1c8d74639b64c40e0e986a9bad4fb0156b6a45bdb734', // period 795 sha root
    '0x0f51f5a9fbce6ada1dafcae5325588c7260b1e452e9821e59df45fa396bd37f2', // period 795 poseidon root
    verifier.address
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
