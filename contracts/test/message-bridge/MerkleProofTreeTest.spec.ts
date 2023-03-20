import assert from 'assert';
import { Fixture } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';
import { MockMerkleProofTree } from "../../typechain/MockMerkleProofTree";
import { Wallet } from 'ethers';
import { expect } from 'chai';
import { encodeMsg, generateProof, hash2bytes } from './util';
import { arrayify, defaultAbiCoder, hexlify, keccak256, RLP } from 'ethers/lib/utils';

describe('MerkleProofTree Test', async () => {
    function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
        const provider = waffle.provider;
        return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
    }

    async function fixture([admin]: Wallet[]) {
        const merkleProofTree = await deployLib(admin);
        return { admin, merkleProofTree };
      }

    let merkleProofTree: MockMerkleProofTree;

    beforeEach(async () => {
        const res = await loadFixture(fixture);
        merkleProofTree = res.merkleProofTree as MockMerkleProofTree;
      })

    async function deployLib(admin: Wallet) {
        const factory = await ethers.getContractFactory('MockMerkleProofTree');
        const merkleProofTree = factory
          .connect(admin)
          .deploy();
        return merkleProofTree;
      }

    it('should pass with read and verify value from proofs', async() => {
      const accountAddress = "0x00000000000000000000000000000000000000ab";
      const nonce = 32;
      const message = await encodeMsg([nonce, "0xA2B26126ee3E7A26183F4d76837CB6d56bE56637", "0xA2B26126ee3E7A26183F4d76837CB6d56bE56637", 180000, "0xabcd",])
      const proofs = await generateProof(message, accountAddress);
      const storageProofs = proofs[0];
      const accountProofs = proofs[1];

      const accountPath = hash2bytes(accountAddress);
      const accountPathValue = await merkleProofTree.mockRead(accountPath, accountProofs);
      const storageInfoFromAccountPathValue = RLP.decode(accountPathValue)[2];
      assert.equal(storageInfoFromAccountPathValue, keccak256(storageProofs[0]));

      const storagePath = hash2bytes(hash2bytes((arrayify(defaultAbiCoder.encode(['uint256', 'uint256'], [nonce, 1])))));
      const storagePathValue = await merkleProofTree.mockRead(storagePath, storageProofs);
      assert.equal(RLP.decode(storagePathValue), keccak256(message));
    })
    
});