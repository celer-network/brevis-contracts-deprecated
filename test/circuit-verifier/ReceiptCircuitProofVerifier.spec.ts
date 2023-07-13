import { Fixture } from 'ethereum-waffle';
import { ReceiptCircuitProofVerifier, VerifierGasReport } from '../../typechain';
import { ethers, waffle } from 'hardhat';
import { BigNumber, Wallet } from 'ethers';
import { expect } from 'chai';
import { splitHash, hexToBytes } from '../util';

describe('Receipt circuit proof verification', async () => {
  function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    const provider = waffle.provider;
    return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
  }

  async function fixture([admin]: Wallet[]) {
    const originalVerifier = await deployOriginalVerifier(admin);
    const gasReporter = await deployGasReporter(admin, originalVerifier.address);
    return { admin, originalVerifier, gasReporter };
  }

  let gasReporter: VerifierGasReport;

  beforeEach(async () => {
    const res = await loadFixture(fixture);
    gasReporter = res.gasReporter;
  });

  async function deployOriginalVerifier(admin: Wallet) {
    const factory = await ethers.getContractFactory('ReceiptCircuitProofVerifier');
    const contract = (await factory.connect(admin).deploy()) as ReceiptCircuitProofVerifier;
    return contract;
  }

  async function deployGasReporter(admin: Wallet, originalVerifierAddress: string) {
    const factory = await ethers.getContractFactory('VerifierGasReport');
    const contract = (await factory.connect(admin).deploy(originalVerifierAddress)) as VerifierGasReport;
    return contract;
  }

  it('Verify receipt circuit Proof', async () => {
    const publicInputs = [
      ...splitHash('ec3384944ee3756aba922025ae1805096022e11d0abbb25be199fc918e4e7765'),
      ...splitHash('a3f5f903ac37f86fa7ff562892d94aa31e65dda2a2a356efe693fef0e35ec313'),
      BigNumber.from('17490377'),
      BigNumber.from('1686893999')
    ];

    await expect(
      gasReporter.receiptVerifyProof(
        [
          BigNumber.from('0x2d00eee00b859cbeca6b703a606cbbc7d6f7b6253977571c539ba6cbf10fcace'),
          BigNumber.from('0x1ea303bca6d60dccf866b1002fd4a035156aa1f695af7d439c7ccd3d24f6e386')
        ],
        [
          [
            BigNumber.from('0x14fa8bc6fcf069e130de5f14d1c45f5b6f4b796a337fcf77e688c41af580412f'),
            BigNumber.from('0x2947d2563d96dc9fa054575c2423b62e09cd9bce90f8c76b61f285a7e9dc6b5c')
          ],
          [
            BigNumber.from('0x19c4f5628fa09412a555b00c469f61f5005ac2bc61ac8c8b1ffc5f212fc2bbf3'),
            BigNumber.from('0x01d696571be2631a06687f02a338146bc9a0a1bd64acf54fd296aa9a744d0565')
          ]
        ],
        [
          BigNumber.from('0x1c2e562b284c0443549212be078b85eca5be38b45e6cfcd940950aaf9216f09d'),
          BigNumber.from('0x14b7b36aa491a0e6a8c1a84735439dac7fbc855773666f899560915a341e1384')
        ],
        [BigNumber.from('0x0'), BigNumber.from('0x0')],
        publicInputs
      )
    )
      .to.emit(gasReporter, 'ProofVerified')
      .withArgs(true);
  });

  it('Verify receipt Proof failure', async () => {
    const publicInputs = [
      ...splitHash('ec3384944ee3756aba922025ae1805096022e11d0abbb25be199fc918e4e7765'),
      ...splitHash('a3f5f903ac37f86fa7ff562892d94aa31e65dda2a2a356efe693fef0e35ec313'),
      BigNumber.from('17490377'),
      BigNumber.from('0') /// Change this for mock failure
    ];

    await expect(
      gasReporter.receiptVerifyProof(
        [
          BigNumber.from('0x2d00eee00b859cbeca6b703a606cbbc7d6f7b6253977571c539ba6cbf10fcace'),
          BigNumber.from('0x1ea303bca6d60dccf866b1002fd4a035156aa1f695af7d439c7ccd3d24f6e386')
        ],
        [
          [
            BigNumber.from('0x14fa8bc6fcf069e130de5f14d1c45f5b6f4b796a337fcf77e688c41af580412f'),
            BigNumber.from('0x2947d2563d96dc9fa054575c2423b62e09cd9bce90f8c76b61f285a7e9dc6b5c')
          ],
          [
            BigNumber.from('0x19c4f5628fa09412a555b00c469f61f5005ac2bc61ac8c8b1ffc5f212fc2bbf3'),
            BigNumber.from('0x01d696571be2631a06687f02a338146bc9a0a1bd64acf54fd296aa9a744d0565')
          ]
        ],
        [
          BigNumber.from('0x1c2e562b284c0443549212be078b85eca5be38b45e6cfcd940950aaf9216f09d'),
          BigNumber.from('0x14b7b36aa491a0e6a8c1a84735439dac7fbc855773666f899560915a341e1384')
        ],
        [BigNumber.from('0x0'), BigNumber.from('0x0')],
        publicInputs
      )
    )
      .to.emit(gasReporter, 'ProofVerified')
      .withArgs(false);
  });

  it('Verify receipt Proof with raw data', async () => {
    const leafHash = divideToTwoString('0xec3384944ee3756aba922025ae1805096022e11d0abbb25be199fc918e4e7765');
    const blockHash = divideToTwoString('0xa3f5f903ac37f86fa7ff562892d94aa31e65dda2a2a356efe693fef0e35ec313');

    const publicInputs = [
      BigNumber.from(leafHash[0]),
      BigNumber.from(leafHash[1]),

      BigNumber.from(blockHash[0]),
      BigNumber.from(blockHash[1]),

      BigNumber.from('17490377'),
      BigNumber.from('1686893999')
    ];

    const a = [
      BigNumber.from('0x2d00eee00b859cbeca6b703a606cbbc7d6f7b6253977571c539ba6cbf10fcace'),
      BigNumber.from('0x1ea303bca6d60dccf866b1002fd4a035156aa1f695af7d439c7ccd3d24f6e386')
    ];

    const b = [
      [
        BigNumber.from('0x14fa8bc6fcf069e130de5f14d1c45f5b6f4b796a337fcf77e688c41af580412f'),
        BigNumber.from('0x2947d2563d96dc9fa054575c2423b62e09cd9bce90f8c76b61f285a7e9dc6b5c')
      ],
      [
        BigNumber.from('0x19c4f5628fa09412a555b00c469f61f5005ac2bc61ac8c8b1ffc5f212fc2bbf3'),
        BigNumber.from('0x01d696571be2631a06687f02a338146bc9a0a1bd64acf54fd296aa9a744d0565')
      ]
    ];

    const c = [
      BigNumber.from('0x1c2e562b284c0443549212be078b85eca5be38b45e6cfcd940950aaf9216f09d'),
      BigNumber.from('0x14b7b36aa491a0e6a8c1a84735439dac7fbc855773666f899560915a341e1384')
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

    await expect(gasReporter.verifyRaw(hexToBytes(allDataHex)))
      .to.emit(gasReporter, 'ProofVerified')
      .withArgs(true);
  });

  it('Verify receipt proof with raw data failure', async () => {
    const leafHash = divideToTwoString('0xec3384944ee3756aba922025ae1805096022e11d0abbb25be199fc918e4e7765');
    const blockHash = divideToTwoString('0xa3f5f903ac37f86fa7ff562892d94aa31e65dda2a2a356efe693fef0e35ec313');

    const publicInputs = [
      BigNumber.from(leafHash[0]),
      BigNumber.from(leafHash[1]),

      BigNumber.from(blockHash[0]),
      BigNumber.from(blockHash[1]),

      BigNumber.from('17490377'),
      BigNumber.from('0')
    ];

    const a = [
      BigNumber.from('0x2d00eee00b859cbeca6b703a606cbbc7d6f7b6253977571c539ba6cbf10fcace'),
      BigNumber.from('0x1ea303bca6d60dccf866b1002fd4a035156aa1f695af7d439c7ccd3d24f6e386')
    ];

    const b = [
      [
        BigNumber.from('0x14fa8bc6fcf069e130de5f14d1c45f5b6f4b796a337fcf77e688c41af580412f'),
        BigNumber.from('0x2947d2563d96dc9fa054575c2423b62e09cd9bce90f8c76b61f285a7e9dc6b5c')
      ],
      [
        BigNumber.from('0x19c4f5628fa09412a555b00c469f61f5005ac2bc61ac8c8b1ffc5f212fc2bbf3'),
        BigNumber.from('0x01d696571be2631a06687f02a338146bc9a0a1bd64acf54fd296aa9a744d0565')
      ]
    ];

    const c = [
      BigNumber.from('0x1c2e562b284c0443549212be078b85eca5be38b45e6cfcd940950aaf9216f09d'),
      BigNumber.from('0x14b7b36aa491a0e6a8c1a84735439dac7fbc855773666f899560915a341e1384')
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

    await expect(gasReporter.verifyRaw(hexToBytes(allDataHex)))
      .to.emit(gasReporter, 'ProofVerified')
      .withArgs(false);
  });
});

const divideToTwoString = (input: string) => {
  return [input.slice(0, 34), '0x' + input.slice(34, 66)];
};
