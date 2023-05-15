import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as BN from 'bn.js';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';
import {
  generateRandomDecimalNumber,
  getConnectionOptions,
} from 'test/test-utils';

// Define separate address for testing to avoid conflicts with other tests
const TEST_USER_ADDRESS = '0x000000001';

describe('TokenBalanceService', () => {
  let service: TokenBalanceService;

  beforeEach(async () => {
    const options = getConnectionOptions();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...options,
          entities: [TokenBalance],
        }),
        TypeOrmModule.forFeature([TokenBalance]),
      ],

      providers: [TokenBalanceService],
    }).compile();

    service = module.get<TokenBalanceService>(TokenBalanceService);

    await service.tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS });
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create', () => {
    it('should create a new balance', async () => {
      const balance = await service.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe(TEST_USER_ADDRESS);
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');
    });
  });

  describe('get balance single network', () => {
    const baseTokenBalance = {
      address: TEST_USER_ADDRESS,
      network: 1,
    };

    beforeEach(async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS,
      });
      // Fill sample data
      await service.create({
        ...baseTokenBalance,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1000,2000)',
      });
      await service.create({
        ...baseTokenBalance,
        balance: '2000000000000000000',
        timeRange: '[2021-01-02,2021-01-03)',
        blockRange: '[2000,3000)',
      });
      await service.create({
        ...baseTokenBalance,
        balance: '3000000000000000000',
        timeRange: '[2021-01-03,)',
        blockRange: '[3000,)',
      });
    });

    it('get simple balance', async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS,
      });
      const data = {
        ...baseTokenBalance,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,)',
      };
      await service.create(data);
      const balance = await service.getBalanceSingleUser({
        address: data.address,
        network: data.network,
      });
      expect(balance).not.toBeNull();
      expect(balance).toBeTruthy();
      expect(balance.address).toBe(data.address);
      expect(balance.network).toBe(data.network);
    });

    it('get balance by timestamp and block', async () => {
      let balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        network: baseTokenBalance.network,
        timestamp: new Date('2021-01-02 GMT').getTime() / 1000,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('2000000000000000000');

      balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        network: baseTokenBalance.network,
        block: 1533,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('1000000000000000000');
    });

    it('get latest balance when no timestamp or block is provided', async () => {
      const balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        network: baseTokenBalance.network,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('3000000000000000000');
    });
  });

  describe('get balance multiple networks', () => {
    const baseTokenBalance = {
      address: TEST_USER_ADDRESS,
    };
    const networks = [1, 2, 3, 4, 5];
    let earliestBalances: Partial<TokenBalance>[] = [];
    let latestBalances: Partial<TokenBalance>[] = [];

    beforeEach(async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS,
      });
      earliestBalances = networks.map(network => ({
        ...baseTokenBalance,
        timeRange: '[2020-01-01,2021-01-01)',
        blockRange: '[0,1000)',
        network,
        balance: generateRandomDecimalNumber(31), // To avoid overflow in 32 bytes
      }));
      latestBalances = networks.map(network => ({
        ...baseTokenBalance,
        timeRange: '[2021-01-01,)',
        blockRange: '[1000,)',
        network,
        balance: generateRandomDecimalNumber(31), // To avoid overflow in 32 bytes
      }));

      // Fill sample data
      await service.tokenBalanceRepository.save(earliestBalances);
      await service.tokenBalanceRepository.save(latestBalances);
    });

    it('get balance multiple networks', async () => {
      // Get balance for networks 1, 2, 3
      const result = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        network: networks.slice(0, 3),
      });

      const expectedBalance = latestBalances
        .slice(0, 3)
        .reduce(
          (balanceBN, tokenBalance) =>
            balanceBN.add(new BN(tokenBalance.balance)),
          new BN(0),
        )
        .toString();

      expect(result).toBeTruthy();
      expect(result.balanceSum).toEqual(expectedBalance);
    });

    it('get balance all networks', async () => {
      const result = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
      });

      const expectedBalance = latestBalances
        .reduce(
          (balanceBN, tokenBalance) =>
            balanceBN.add(new BN(tokenBalance.balance)),
          new BN(0),
        )
        .toString();

      expect(result).toBeTruthy();
      expect(result.balanceSum).toEqual(expectedBalance);
    });
    it('get balance all network at specific timestamp', async () => {
      const result = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        timestamp: new Date('2020-02-01 GMT').getTime() / 1000,
      });

      const expectedBalance = earliestBalances
        .reduce(
          (balanceBN, tokenBalance) =>
            balanceBN.add(new BN(tokenBalance.balance)),
          new BN(0),
        )
        .toString();

      expect(result).toBeTruthy();
      expect(result.balanceSum).toEqual(expectedBalance);
    });
  });
});
