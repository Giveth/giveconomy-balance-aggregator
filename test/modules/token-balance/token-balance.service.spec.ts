import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import BN from 'bn.js';
import { TokenBalanceUpdate } from 'src/modules/token-balance/token-balance-update.entity';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';
import {
  generateRandomDecimalNumber,
  getConnectionOptions,
} from 'test/test-utils';

// Define separate address for testing to avoid conflicts with other tests
const TEST_USER_ADDRESS_1 = '0x000000001';
const TEST_USER_ADDRESS_2 = '0x000000002';

describe('TokenBalanceService', () => {
  let service: TokenBalanceService;

  beforeEach(async () => {
    const options = getConnectionOptions();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...options,
          entities: [TokenBalance, TokenBalanceUpdate],
        }),
        TypeOrmModule.forFeature([TokenBalance, TokenBalanceUpdate]),
      ],

      providers: [TokenBalanceService],
    }).compile();

    service = module.get<TokenBalanceService>(TokenBalanceService);

    await service.tokenBalanceRepository.clear();
    await service.tokenBalanceUpdateRepository.clear();
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create', () => {
    beforeEach(async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS_1,
      });
    });
    it('should create a new balance', async () => {
      const balance = await service.create({
        address: TEST_USER_ADDRESS_1,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe(TEST_USER_ADDRESS_1);
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');
    });

    it('should create a new balance by subgraphBalanceChangeEntity', async () => {
      const date = new Date('2021-01-02 UTC');
      const [balance] = await service.saveTokenBalanceFromSubgraphMany(
        [
          {
            id: '---',
            time: `${date.getTime() / 1000}`,
            block: '2000',
            newBalance: '1000000000000000000',
            amount: '200',
            account: TEST_USER_ADDRESS_1,
            contractAddress: '0x0000000000',
          },
        ],
        1,
      );
      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe(TEST_USER_ADDRESS_1);
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');
    });

    it('should create multiple subgraphBalanceChangeEntity', async () => {
      const date = new Date('2021-01-02 UTC');
      const balances = await service.saveTokenBalanceFromSubgraphMany(
        [
          {
            id: '---',
            time: `${date.getTime() / 1000}`,
            block: '2000',
            newBalance: '1000000000000000000',
            amount: '200',
            account: TEST_USER_ADDRESS_1,
            contractAddress: '0x0000000000',
          },
          {
            id: '---',
            time: `${date.getTime() / 1000}`,
            block: '2000',
            newBalance: '2000000000000000000',
            amount: '200',
            account: TEST_USER_ADDRESS_1,
            contractAddress: '0x0000000000',
          },
        ],
        1,
      );
      expect(balances.length).toBe(2);
    });

    it('should not create anything if there is an issue with one of the subgraphBalanceChangeEntity', async () => {
      // Date 3 is before date 2, overlaps with date 1 and date 2
      const date1 = new Date('2021-01-02 UTC');
      const date2 = new Date('2021-01-04 UTC');
      const date3 = new Date('2021-01-03 UTC');
      const subgraphEntities = [
        {
          id: '---',
          time: `${date1.getTime() / 1000}`,
          block: '1000',
          newBalance: '1000000000000000000',
          amount: '100',
          account: TEST_USER_ADDRESS_1,
          contractAddress: '0x0000000000',
        },
        {
          id: '---',
          time: `${date2.getTime() / 1000}`,
          block: '3000',
          newBalance: '3000000000000000000',
          amount: '300',
          account: TEST_USER_ADDRESS_1,
          contractAddress: '0x0000000000',
        },
        {
          id: '---',
          time: `${date3.getTime() / 1000}`,
          block: '2000',
          newBalance: '2000000000000000000',
          amount: '200',
          account: TEST_USER_ADDRESS_1,
          contractAddress: '0x0000000000',
        },
      ];

      await expect(
        service.saveTokenBalanceFromSubgraphMany(subgraphEntities, 1),
      ).rejects.toThrow();
      const count = await service.tokenBalanceRepository.count({
        where: { address: TEST_USER_ADDRESS_1 },
      });
      expect(count).toBe(0);
    });
  });

  describe('get balance single network', () => {
    const baseTokenBalance = {
      address: TEST_USER_ADDRESS_1,
      network: 1,
    };

    beforeEach(async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS_1,
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

    it('get empty balance', async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS_1,
      });
      let balance = await service.getBalanceSingleUser({
        address: TEST_USER_ADDRESS_1,
      });
      expect(balance).toBeUndefined();

      // Single network
      balance = await service.getBalanceSingleUser({
        address: TEST_USER_ADDRESS_1,
        networks: 1,
      });
      expect(balance).toBeUndefined();

      // multiple network
      balance = await service.getBalanceSingleUser({
        address: TEST_USER_ADDRESS_1,
        networks: [1, 2],
      });
      expect(balance).toBeUndefined();
    });

    it('get simple balance', async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS_1,
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
        networks: data.network,
      });
      expect(balance).not.toBeFalsy();
      expect(balance.address).toBe(data.address);
      expect(balance.networks).toEqual([data.network]);
    });

    it('get balance by timestamp and block', async () => {
      let balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        networks: baseTokenBalance.network,
        timestamp: new Date('2021-01-02 UTC').getTime() / 1000,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('2000000000000000000');

      balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        networks: baseTokenBalance.network,
        block: 1533,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('1000000000000000000');
    });

    it('get latest balance when no timestamp or block is provided', async () => {
      const balance = await service.getBalanceSingleUser({
        address: baseTokenBalance.address,
        networks: baseTokenBalance.network,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('3000000000000000000');
    });
  });

  describe('get balance multiple networks', () => {
    const baseTokenBalance = {
      address: TEST_USER_ADDRESS_1,
    };
    const networks = [1, 2, 3, 4, 5];
    let earliestBalances: Partial<TokenBalance>[] = [];
    let latestBalances: Partial<TokenBalance>[] = [];

    beforeEach(async () => {
      await service.tokenBalanceRepository.delete({
        address: TEST_USER_ADDRESS_1,
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
        networks: networks.slice(0, 3),
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
      expect(result.balance).toEqual(expectedBalance);
      expect(result.networks).toEqual(networks.slice(0, 3));
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
      expect(result.balance).toEqual(expectedBalance);
      expect(result.networks).toEqual(networks);
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
      expect(result.balance).toEqual(expectedBalance);
    });
  });

  describe('get balance update after date', () => {
    let balances: Partial<TokenBalance>[] = [];
    const updateDates = [
      new Date('2001-01-01 GMT'),
      new Date('2002-01-01 GMT'),
      new Date('2003-01-01 GMT'),
    ];
    beforeEach(async () => {
      await service.tokenBalanceRepository.clear();
      await service.tokenBalanceUpdateRepository.clear();

      const tokenBalances: Omit<TokenBalance, 'id' | 'update_at'>[] = [
        {
          address: TEST_USER_ADDRESS_1,
          network: 1,
          balance: '100',
          timeRange: '[2001-01-01,2002-01-01)',
          blockRange: '[1000,)',
        },
        {
          address: TEST_USER_ADDRESS_1,
          network: 2,
          balance: '200',
          timeRange: '[2001-01-01,2002-01-01)',
          blockRange: '[1000,)',
        },
        {
          address: TEST_USER_ADDRESS_2,
          network: 3,
          balance: '500',
          timeRange: '[2001-01-01,2002-01-01)',
          blockRange: '[1000,)',
        },
      ];

      balances = await service.tokenBalanceRepository.save(tokenBalances);

      // add obsolete token balances
      const pastTokenBalances: Omit<TokenBalance, 'id' | 'update_at'>[] = [
        {
          address: TEST_USER_ADDRESS_1,
          network: 1,
          balance: '1000',
          timeRange: '[1991-01-01,2001-01-01)',
          blockRange: '[0000,1000)',
        },
        {
          address: TEST_USER_ADDRESS_1,
          network: 2,
          balance: '2000',
          timeRange: '[1991-01-01,2001-01-01)',
          blockRange: '[0000,1000)',
        },
        {
          address: TEST_USER_ADDRESS_2,
          network: 3,
          balance: '500',
          timeRange: '[1991-01-01,2001-01-01)',
          blockRange: '[0000,1000)',
        },
      ];
      await service.tokenBalanceRepository.save(pastTokenBalances);

      // Set update_at of balances
      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i];
        await service.tokenBalanceUpdateRepository.update(
          { address: balance.address },
          { update_at: updateDates[i] },
        );
        balance.update_at = updateDates[i];
        await service.tokenBalanceRepository.save(balance);
      }
    });

    it('should return correct value for simple query', async () => {
      const [result, count] = await service.getBalancesUpdateAfterDate({
        since: new Date(0),
      });

      expect(count).toEqual(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [1, 2],
        balance: '300',
      });
      expect(result[1]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should return balances of specific network - 1', async () => {
      const [result] = await service.getBalancesUpdateAfterDate({
        since: new Date(0),
        networks: [2, 3],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [2],
        balance: '200',
      });
      expect(result[1]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should return balances of specific network - 2', async () => {
      const [result] = await service.getBalancesUpdateAfterDate({
        since: new Date(0),
        networks: 3,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should return only balances updated after specific date', async () => {
      // No balance of a user is update after the date
      const [result] = await service.getBalancesUpdateAfterDate({
        since: new Date(updateDates[1].getTime() + 1), // 1ms after update
      });

      expect(result).toEqual([
        {
          address: TEST_USER_ADDRESS_2,
          networks: [3],
          balance: '500',
          update_at: updateDates[2],
        },
      ]);
    });

    it('should return balance of a user if one of its balances is updated after the date', async () => {
      const [result] = await service.getBalancesUpdateAfterDate({
        since: new Date(updateDates[1].getTime() - 1), // 1ms before update
      });

      // Single balance of a user is update after the date
      expect(result).toEqual([
        {
          address: TEST_USER_ADDRESS_1,
          networks: [1, 2],
          balance: '300',
          update_at: updateDates[1],
        },
        {
          address: TEST_USER_ADDRESS_2,
          networks: [3],
          balance: '500',
          update_at: updateDates[2],
        },
      ]);
    });

    it('should support pagination', async () => {
      let [result, count] = await service.getBalancesUpdateAfterDate({
        since: new Date(0), // 1ms before update
        take: 1,
      });

      expect(count).toEqual(2);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [1, 2],
        balance: '300',
      });

      [result, count] = await service.getBalancesUpdateAfterDate({
        since: new Date(0), // 1ms before update
        take: 1,
        skip: 1,
      });
      expect(count).toEqual(2);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });

      [result, count] = await service.getBalancesUpdateAfterDate({
        since: new Date(0), // 1ms before update
        take: 1,
        skip: 2,
      });
      expect(count).toEqual(2);
      expect(result).toHaveLength(0);
    });
  });
});
