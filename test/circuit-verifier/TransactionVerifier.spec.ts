import { Fixture } from 'ethereum-waffle';
import { TransactionProofVerifier, VerifierGasReport } from '../../typechain';
import { ethers, waffle } from 'hardhat';
import { BigNumber, Wallet } from 'ethers';
import { expect } from 'chai';
import { splitHash, hexToBytes } from '../util';

describe('Transaction proof verify', async () => {
  function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    const provider = waffle.provider;
    return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
  }

  async function fixture([admin]: Wallet[]) {
    const verifier = await deployLib(admin);
    return { admin, verifier };
  }

  let verifier: VerifierGasReport;
  let admin: Wallet;

  beforeEach(async () => {
    const res = await loadFixture(fixture);
    verifier = res.verifier;
    admin = res.admin;
  });

  async function deployLib(admin: Wallet) {
    const _factory = await ethers.getContractFactory('TransactionProofVerifier');
    const _contract = (await _factory.connect(admin).deploy()) as TransactionProofVerifier;
    const factory = await ethers.getContractFactory('VerifierGasReport');
    const contract = (await factory.connect(admin).deploy(_contract.address)) as VerifierGasReport;
    return contract;
  }

  it('Verify transaction Proof', async () => {
    const publicInputs = [
      ...splitHash('958c0c028b7a8fe0a3d5961620582cad1f557604937a104f77246246118a24c7'),
      ...splitHash('88bd78528ea4fd5c232978ce51e43f41f0d76ce56e331147c1c9611282308799'),
      BigNumber.from('17086605'),
      BigNumber.from('1681980179')
    ];
    await expect(
      verifier.transactionVerifyProof(
        [
          BigNumber.from('0x091712d21a7fb14be9027310e2cbcc7d9d4132d6422598586a4a1e481d69d234'),
          BigNumber.from('0x16c655962badf7228ca62ae8d5674c1bdf10cd4edbd880e039a54ef6e2e55eab')
        ],
        [
          [
            BigNumber.from('0x0798c4c36b7d42124034a55327f8af1a2ec29ecedf1dd7c8b72690164f7d7841'),
            BigNumber.from('0x0398de45e5843c72045fc9d01479c34ea4e6eebfbc8cbb4d13e35f36191c83ca')
          ],
          [
            BigNumber.from('0x1e8324d656f1700f87a9b7f8f06b081f5ed8e7dd363a56fad209997815ea54b6'),
            BigNumber.from('0x231a2b40a5147fcf71ab6d80de168e6a30cb26b87b14ae0ab7c3c9f1bd355513')
          ]
        ],
        [
          BigNumber.from('0x23d9a9af2e7544e6c0941cdf92115b40ddbd2b0a6bd33ef343823ea4c4e9ec11'),
          BigNumber.from('0x2eb59836c9c43e2a6a6abc07ca138cb9a70588dd72befa183a4d8af4bec4b44c')
        ],
        [BigNumber.from('0x0'), BigNumber.from('0x0')],
        publicInputs
      )
    )
      .to.emit(verifier, 'ProofVerified')
      .withArgs(true);
  });

  it('Verify transaction Proof failure', async () => {
    const publicInputs = [
      ...splitHash('958c0c028b7a8fe0a3d5961620582cad1f557604937a104f77246246118a24c7'),
      ...splitHash('88bd78528ea4fd5c232978ce51e43f41f0d76ce56e331147c1c9611282308799'),
      BigNumber.from('0'),
      BigNumber.from('1681980179')
    ];
    await expect(
      verifier.transactionVerifyProof(
        [
          BigNumber.from('0x091712d21a7fb14be9027310e2cbcc7d9d4132d6422598586a4a1e481d69d234'),
          BigNumber.from('0x16c655962badf7228ca62ae8d5674c1bdf10cd4edbd880e039a54ef6e2e55eab')
        ],
        [
          [
            BigNumber.from('0x0798c4c36b7d42124034a55327f8af1a2ec29ecedf1dd7c8b72690164f7d7841'),
            BigNumber.from('0x0398de45e5843c72045fc9d01479c34ea4e6eebfbc8cbb4d13e35f36191c83ca')
          ],
          [
            BigNumber.from('0x1e8324d656f1700f87a9b7f8f06b081f5ed8e7dd363a56fad209997815ea54b6'),
            BigNumber.from('0x231a2b40a5147fcf71ab6d80de168e6a30cb26b87b14ae0ab7c3c9f1bd355513')
          ]
        ],
        [
          BigNumber.from('0x23d9a9af2e7544e6c0941cdf92115b40ddbd2b0a6bd33ef343823ea4c4e9ec11'),
          BigNumber.from('0x2eb59836c9c43e2a6a6abc07ca138cb9a70588dd72befa183a4d8af4bec4b44c')
        ],
        [BigNumber.from('0x0'), BigNumber.from('0x0')],
        publicInputs
      )
    )
      .to.emit(verifier, 'ProofVerified')
      .withArgs(false);
  });

  it('Verify transaction Proof with raw data', async () => {
    const leafHash = divideToTwoString('0x958c0c028b7a8fe0a3d5961620582cad1f557604937a104f77246246118a24c7');
    const blockHash = divideToTwoString('0x88bd78528ea4fd5c232978ce51e43f41f0d76ce56e331147c1c9611282308799');

    const publicInputs = [
      BigNumber.from(leafHash[0]),
      BigNumber.from(leafHash[1]),

      BigNumber.from(blockHash[0]),
      BigNumber.from(blockHash[1]),

      BigNumber.from('17086605'),
      BigNumber.from('1681980179')
    ];

    const a = [
      BigNumber.from('0x091712d21a7fb14be9027310e2cbcc7d9d4132d6422598586a4a1e481d69d234'),
      BigNumber.from('0x16c655962badf7228ca62ae8d5674c1bdf10cd4edbd880e039a54ef6e2e55eab')
    ];

    const b = [
      [
        BigNumber.from('0x0798c4c36b7d42124034a55327f8af1a2ec29ecedf1dd7c8b72690164f7d7841'),
        BigNumber.from('0x0398de45e5843c72045fc9d01479c34ea4e6eebfbc8cbb4d13e35f36191c83ca')
      ],
      [
        BigNumber.from('0x1e8324d656f1700f87a9b7f8f06b081f5ed8e7dd363a56fad209997815ea54b6'),
        BigNumber.from('0x231a2b40a5147fcf71ab6d80de168e6a30cb26b87b14ae0ab7c3c9f1bd355513')
      ]
    ];

    const c = [
      BigNumber.from('0x23d9a9af2e7544e6c0941cdf92115b40ddbd2b0a6bd33ef343823ea4c4e9ec11'),
      BigNumber.from('0x2eb59836c9c43e2a6a6abc07ca138cb9a70588dd72befa183a4d8af4bec4b44c')
    ];

    const commitment = [BigNumber.from('0x0'), BigNumber.from('0x0')];

    const allData = [...a];
    allData.push(...b[0], ...b[1]);
    allData.push(...c);
    allData.push(...commitment);
    allData.push(...publicInputs);

    let allDataHex = '';
    for (let i = 0; i < allData.length; i++) {
      allDataHex = allDataHex + BigNumber.from(allData[i]).toHexString().slice(2).padStart(64, '0');
    }

    await expect(verifier.verifyRaw(hexToBytes(allDataHex)))
      .to.emit(verifier, 'ProofVerified')
      .withArgs(true);
  });

  it('Verify transaction Proof with raw data failure', async () => {
    const leafHash = divideToTwoString('0x958c0c028b7a8fe0a3d5961620582cad1f557604937a104f77246246118a24c7');
    const blockHash = divideToTwoString('0x88bd78528ea4fd5c232978ce51e43f41f0d76ce56e331147c1c9611282308799');

    const publicInputs = [
      BigNumber.from(leafHash[0]),
      BigNumber.from(leafHash[1]),

      BigNumber.from(blockHash[0]),
      BigNumber.from(blockHash[1]),

      BigNumber.from('17086605'),
      BigNumber.from('0')
    ];

    const a = [
      BigNumber.from('0x091712d21a7fb14be9027310e2cbcc7d9d4132d6422598586a4a1e481d69d234'),
      BigNumber.from('0x16c655962badf7228ca62ae8d5674c1bdf10cd4edbd880e039a54ef6e2e55eab')
    ];

    const b = [
      [
        BigNumber.from('0x0798c4c36b7d42124034a55327f8af1a2ec29ecedf1dd7c8b72690164f7d7841'),
        BigNumber.from('0x0398de45e5843c72045fc9d01479c34ea4e6eebfbc8cbb4d13e35f36191c83ca')
      ],
      [
        BigNumber.from('0x1e8324d656f1700f87a9b7f8f06b081f5ed8e7dd363a56fad209997815ea54b6'),
        BigNumber.from('0x231a2b40a5147fcf71ab6d80de168e6a30cb26b87b14ae0ab7c3c9f1bd355513')
      ]
    ];

    const c = [
      BigNumber.from('0x23d9a9af2e7544e6c0941cdf92115b40ddbd2b0a6bd33ef343823ea4c4e9ec11'),
      BigNumber.from('0x2eb59836c9c43e2a6a6abc07ca138cb9a70588dd72befa183a4d8af4bec4b44c')
    ];

    const commitment = [BigNumber.from('0x0'), BigNumber.from('0x0')];

    const allData = [...a];
    allData.push(...b[0], ...b[1]);
    allData.push(...c);
    allData.push(...commitment);
    allData.push(...publicInputs);

    let allDataHex = '';
    for (let i = 0; i < allData.length; i++) {
      allDataHex = allDataHex + BigNumber.from(allData[i]).toHexString().slice(2).padStart(64, '0');
    }

    await expect(verifier.verifyRaw(hexToBytes(allDataHex)))
      .to.emit(verifier, 'ProofVerified')
      .withArgs(false);
  });
});

const divideToTwoString = (input: string) => {
  return [input.slice(0, 34), '0x' + input.slice(34, 66)];
};
