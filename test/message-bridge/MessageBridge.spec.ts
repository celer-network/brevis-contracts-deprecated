import { Fixture } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';
import { MessageBridge, MockLightClient, MockMessageBridge } from '../../typechain';
import { MockMerkleProofTree } from '../../typechain/MockMerkleProofTree';
import { MessageBridge__factory } from './../../typechain/factories/MessageBridge__factory';

import { expect } from 'chai';
import { Wallet } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';
import { encodeMsg, generateProof } from './util';

describe('MessageBridge Test', async () => {
  function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    const provider = waffle.provider;
    return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
  }

  async function fixture([admin]: Wallet[]) {
    const { mockMessageBridge, messageBridge, mockLightClient, merkleProofTree } = await deployLib(admin);
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
  });

  async function deployLib(admin: Wallet) {
    const merkleFactory = await ethers.getContractFactory('MockMerkleProofTree');
    const merkleProofTree = (await merkleFactory.connect(admin).deploy()) as MockMerkleProofTree;

    const factory = await ethers.getContractFactory('MockMessageBridge');
    const mockMessageBridge = (await factory.connect(admin).deploy()) as MockMessageBridge;

    const mockLightClientFactory = await ethers.getContractFactory('MockLightClient');
    const mockLightClient = (await mockLightClientFactory.connect(admin).deploy()) as MockLightClient;

    const messageBridgeFactory = await ethers.getContractFactory<MessageBridge__factory>('MessageBridge');
    const messageBridge = (await messageBridgeFactory
      .connect(admin)
      .deploy(mockLightClient.address, 500000)) as MessageBridge;

    const tx = await messageBridge.connect(admin).setRemoteMessageBridge(messageBridge.address);
    console.log(tx.hash);

    return { mockMessageBridge, messageBridge, mockLightClient, merkleProofTree };
  }

  it('should pass with execute message', async () => {
    const slot = 1234567;
    const accountAddress = _messageBridge.address;
    const nonce = 32;
    const message = await encodeMsg([
      nonce,
      '0xA2B26126ee3E7A26183F4d76837CB6d56bE56637',
      '0xA2B26126ee3E7A26183F4d76837CB6d56bE56637',
      180000,
      '0xabcd'
    ]);
    const proofs = await generateProof(message, accountAddress);
    const storageProofs = proofs[0];
    const accountProofs = proofs[1];

    await _mockMessageBridge.initialize(
      slot,
      _messageBridge.address,
      _mockLightClient.address,
      keccak256(accountProofs[0])
    );

    await expect(_mockMessageBridge.testExecutedMessage(message, accountProofs, storageProofs))
      .to.emit(_messageBridge, 'StorageRootVerified')
      .to.emit(_messageBridge, 'MessageExecuted');
  });
});
