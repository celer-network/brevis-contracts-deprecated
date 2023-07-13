import { Fixture } from 'ethereum-waffle';
import { ethers, getChainId, waffle } from 'hardhat';
import { UniswapVolume } from '../../typechain';
import { expect } from 'chai';
import { Wallet } from 'ethers';

describe('Swap Volume Test', async () => {
  let uniswapVolume: UniswapVolume;
  const zeroAddr = '0x0000000000000000000000000000000000000000';

  function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    const provider = waffle.provider;
    return waffle.createFixtureLoader(provider.getWallets(), provider)(fixture);
  }
  async function fixture([admin]: Wallet[]) {
    const { uniswapVolume } = await deployLib(admin);
    return { uniswapVolume };
  }
  async function deployLib(admin: Wallet) {
    const uniswapVolumeFactory = await ethers.getContractFactory('UniswapVolume');
    const uniswapVolume = (await uniswapVolumeFactory.connect(admin).deploy(zeroAddr)) as UniswapVolume;
    await uniswapVolume.setWETH(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    await uniswapVolume.setUSDC(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6);
    return { uniswapVolume };
  }

  beforeEach(async () => {
    const res = await loadFixture(fixture);
    uniswapVolume = res.uniswapVolume;
  });

  it('should decode swap usdc value correctly', async () => {
    const chainId = 1;

    // https://etherscan.io/tx/0x099f29e7ac5cc1bae0ff69681a71cc5ef94ad430e90e6d7f6e5943a0e5c70382
    // 0x000c V3_SWAP_EXACT_IN amountIn 3000000000 amountOutMin 1663543669106613212
    // tokenA 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 tokenB 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    let data =
      '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000006425300f0000000000000000000000000000000000000000000000000000000000000002000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000b2d05e000000000000000000000000000000000000000000000000001716182739731bdc00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002ba0b86991c6218b36c1d19d4a2e9eb0ce3606eb480001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000001716182739731bdc';
    let res = await uniswapVolume.usdcSwapAmount(chainId, data);

    // https://etherscan.io/tx/0xf988d9eb89dc0ef27fc933fa4f5c54b96924fa416ccbf0e55e01c8cc6ddfc12e
    // 0x0b00 V3_SWAP_EXACT_IN amountIn 3100000000000000000 amountOutMin 5763089829
    // tokenA 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 tokenB 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    data =
      '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000064793ae300000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000002b05699353b60000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000002b05699353b60000000000000000000000000000000000000000000000000000000000015781c5a500000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000';
    res = await uniswapVolume.usdcSwapAmount(chainId, data);
    expect(res.amount.toNumber()).to.equal(5763089829);

    // https://etherscan.io/tx/0xadb76cd0f4c0befef3e1cbbc57c3bab3f0ebcdb554162d466c83a26baac9be97
    // 0x010c V3_SWAP_EXACT_OUT amountOut 3150000000000000000 amountInMax 6011088890
    // tokenA 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 tokenB 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    data =
      '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000064763b8b0000000000000000000000000000000000000000000000000000000000000002010c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000002bb70c4f827b0000000000000000000000000000000000000000000000000000000000016649effa00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000002bb70c4f827b0000';
    res = await uniswapVolume.usdcSwapAmount(chainId, data);
    expect(res.amount.toNumber()).to.equal(6011088890);

    // https://etherscan.io/tx/0x4e383dffcdba1992d0a1ba40753e4e13e54ccc5394e94de556fd7070fa40fea0
    // 0x0a000c V3_SWAP_EXACT_IN
    data =
      '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000647ed8af00000000000000000000000000000000000000000000000000000000000000030a000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000064a65eab0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b00000000000000000000000000000000000000000000000000000000647ed8b300000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000416d5a4a83f4e5e28f076f99e28e23230fd08339aefd0eb353fd9a668ca8ebcf6b1dba7281ed336c9c71cff968cf0720c762aa7232f1860dfaf9b7170a3a23b7441c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000011e1a3000000000000000000000000000000000000000000000000000242be8a67a9f37a00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002ba0b86991c6218b36c1d19d4a2e9eb0ce3606eb480001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000242be8a67a9f37a';
    res = await uniswapVolume.usdcSwapAmount(chainId, data);
    expect(res.amount.toNumber()).to.equal(300000000);

    // https://etherscan.io/tx/0xf993dc597250c3ec6f60d1c3e6ec8a5fee2ef6430e26f44361cbe4c8ac235e9d
    // 0x0a010c V3_SWAP_EXACT_OUT
    data =
      '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000647ece6b00000000000000000000000000000000000000000000000000000000000000030a010c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000064a6546c0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b00000000000000000000000000000000000000000000000000000000647ece7400000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000041aa5b6f6293b1a850db113519219a1ab29b4d8a2c3079b500a0eaad9ffd14b12671add9a935c4a4ca24cff70e41cb4cf94527d8ae3717c5dc1c801227eefa03081c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000098a7d9b8314c000000000000000000000000000000000000000000000000000000000004a893d6f500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000064dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000098a7d9b8314c0000';
    res = await uniswapVolume.usdcSwapAmount(chainId, data);
    expect(res.amount.toNumber()).to.equal(20008130293);

    // https://etherscan.io/tx/0xbe432c7984374788be909ce5472b8100349f730889bd4406135093abe804cf0b
    // 0x0a00 execute without deadline
    data =
      '0x24856bc30000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000020a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000064ae1e120000000000000000000000000000000000000000000000000000000000000002000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b000000000000000000000000000000000000000000000000000000006486981a00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000413385e9e55f2bb34e442699933afcb89a5f34b1a057dabed18a3b513b83977f1b48f0cc5de7cc7de385117f85545a39431dd747dbd31bfd38fec4edc3774a9e6b1b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000014fe21f94665f173d99503d254bea54b5081d49d0000000000000000000000000000000000000000000000000b1a2bc2ec50000000000000000000000000000000000000000000000000000000000000528690fa00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000';
    res = await uniswapVolume.usdcSwapAmount(chainId, data);
    expect(res.amount.toNumber()).to.equal(1384550650);
  });
});
