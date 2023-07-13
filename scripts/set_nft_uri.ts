import { ethers } from 'hardhat';
import { BrevisUniNFT__factory } from './../typechain/factories/BrevisUniNFT__factory';

const run = async () => {
  const [signer] = await ethers.getSigners();

  const nft = await BrevisUniNFT__factory.connect('0x00', signer);
  const uri = '0x00';
  const tx = await nft.setBaseURI(uri);
  console.log(`setBaseURI(${uri}) tx: ${tx.hash}`);
  await tx.wait();
};

run();
