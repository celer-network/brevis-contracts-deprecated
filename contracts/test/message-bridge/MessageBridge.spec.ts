import { Fixture } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';
import { MockMessageBridge, MockLightClient } from '../../typechain';
import { MockMerkleProofTree } from "../../typechain/MockMerkleProofTree";
import { MessageBridge } from '../../typechain';

import { Wallet } from 'ethers';
import { expect } from 'chai';
import { encodeMsg, generateProof, hash2bytes } from './util';
import { arrayify, defaultAbiCoder, hexlify, keccak256, RLP } from 'ethers/lib/utils';

describe('MessageBridge Test', async () => {
    function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
        const provider = waffle.provider;
        return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
    }

    async function fixture([admin]: Wallet[]) {
        const {mockMessageBridge, messageBridge, mockLightClient, merkleProofTree} = await deployLib(admin);
        return { admin, mockMessageBridge, messageBridge, mockLightClient, merkleProofTree };
    }

    let _mockMessageBridge: MockMessageBridge;
    let _mockLightClient: MockLightClient;
    let _messageBridge: MessageBridge;
    let _merkleProofTree: MockMerkleProofTree;

    beforeEach(async () => {
        const res = await loadFixture(fixture);
        const { mockMessageBridge, messageBridge, mockLightClient, merkleProofTree } = res;
        _mockMessageBridge = mockMessageBridge as MockMessageBridge;
        _messageBridge = messageBridge as MessageBridge;
        _mockLightClient = mockLightClient as MockLightClient;
        _merkleProofTree = merkleProofTree as MockMerkleProofTree;
      })

    async function deployLib(admin: Wallet) {
        const merkleFactory = await ethers.getContractFactory('MockMerkleProofTree');
        const merkleProofTree = await merkleFactory
          .connect(admin)
          .deploy() as MockMerkleProofTree;

        const factory = await ethers.getContractFactory('MockMessageBridge');
        const mockMessageBridge = await factory
          .connect(admin)
          .deploy() as MockMessageBridge;
        
        const messageBridgeFactory = await ethers.getContractFactory('MessageBridge');
        const messageBridge = await messageBridgeFactory
          .connect(admin)
          .deploy() as MessageBridge;

        const mockLightClientFactory = await ethers.getContractFactory('MockLightClient');
        const mockLightClient = await mockLightClientFactory
          .connect(admin)
          .deploy() as MockLightClient;

        return { mockMessageBridge, messageBridge, mockLightClient, merkleProofTree } ;
      }

    it('should pass with execute message', async () => {
        const slot = 1234567;
        const accountAddress = _messageBridge.address;
        const nonce = 32;
        const message = await encodeMsg([nonce, "0xA2B26126ee3E7A26183F4d76837CB6d56bE56637", "0xA2B26126ee3E7A26183F4d76837CB6d56bE56637", 180000, "0xabcd",])
        const proofs = await generateProof(message, accountAddress);
        const storageProofs = proofs[0];
        const accountProofs = proofs[1];

        await _mockMessageBridge.initialize(slot, _messageBridge.address, accountAddress, _mockLightClient.address, keccak256(accountProofs[0]));

        await expect(_mockMessageBridge.testExecutedMessage(message, accountProofs, storageProofs)) 
          .to.emit(_messageBridge, "StorageRootVerified")
          .to.emit(_messageBridge, "MessageExecuted")
    });
});