import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TokenBalanceUpdate } from 'src/modules/token-balance/token-balance-update.entity';
import { TokenBalanceController } from 'src/modules/token-balance/token-balance.controller';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';
import { getConnectionOptions } from 'test/test-utils';
import { Repository } from 'typeorm';

const TEST_USER_ADDRESS_1 = '0x1111111111111111111111111111111111111111';
const TEST_USER_ADDRESS_2 = '0x2222222222222222222222222222222222222222';

describe('tokenBalanceController test cases', () => {
  let controller: TokenBalanceController;
  let tokenBalanceRepository: Repository<TokenBalance>;
  let tokenBalanceUpdateRepository: Repository<TokenBalanceUpdate>;

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
      controllers: [TokenBalanceController],
    }).compile();

    controller = module.get<TokenBalanceController>(TokenBalanceController);
    tokenBalanceRepository = module.get<Repository<TokenBalance>>(
      getRepositoryToken(TokenBalance),
    );
    tokenBalanceUpdateRepository = module.get<Repository<TokenBalanceUpdate>>(
      getRepositoryToken(TokenBalanceUpdate),
    );
  });

  describe('getBalance simple', () => {
    beforeEach(async () => {
      await tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS_1 });
    });

    it('should return null when no balance', async () => {
      const result = await controller.getBalance({
        addresses: [TEST_USER_ADDRESS_1],
        network: 1,
      });
      expect(result).toHaveLength(0);
    });
  });
  describe('getBalance on timestamp', () => {
    const oldTimestamp = Math.floor(new Date('2012-01-01').getTime() / 1000);
    beforeEach(async () => {
      await tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS_1 });
      await tokenBalanceRepository.save(
        tokenBalanceRepository.create(
          [
            {
              network: 1,
              balance1: '1000000000000000000',
              balance2: '4000000000000000000',
            },
            {
              network: 2,
              balance1: '2000000000000000000',
              balance2: '5000000000000000000',
            },
            {
              network: 3,
              balance1: '3000000000000000000',
              balance2: '6000000000000000000',
            },
          ]
            .map(({ network, balance1, balance2 }) => [
              {
                network,
                balance: balance1,
                address: TEST_USER_ADDRESS_1,
                timeRange: '[2011-01-01,)',
                blockRange: '[1,)',
              },
              {
                network,
                balance: balance2,
                address: TEST_USER_ADDRESS_1,
                timeRange: '[2021-01-01,)',
                blockRange: '[1,)',
              },
            ])
            .flat(),
        ),
      );
    });

    it('should return balance for single chain', async () => {
      const [result] = await controller.getBalance({
        addresses: [TEST_USER_ADDRESS_1],
        network: 2,
      });
      expect(result.balance).toBe('5000000000000000000');
    });

    it('should return balance for multiple chains', async () => {
      const [result] = await controller.getBalance({
        addresses: [TEST_USER_ADDRESS_1],
        networks: [1, 3],
      });
      expect(result.balance).toBe('10000000000000000000');
    });

    it('should return balance for all chains when chain is not specified', async () => {
      const [result] = await controller.getBalance({
        addresses: [TEST_USER_ADDRESS_1],
      });
      expect(result.balance).toBe('15000000000000000000');
    });

    it('should return balance for single chain on old timestamp', async () => {
      const [result] = await controller.getBalanceByTimestamp({
        addresses: [TEST_USER_ADDRESS_1],
        network: 2,
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('2000000000000000000');
    });

    it('should return balance for multiple chains on old timestamp', async () => {
      const [result] = await controller.getBalanceByTimestamp({
        addresses: [TEST_USER_ADDRESS_1],
        networks: [1, 3],
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('4000000000000000000');
    });

    it('should return balance for all chains when chain is not specified on old timestamp', async () => {
      const [result] = await controller.getBalanceByTimestamp({
        addresses: [TEST_USER_ADDRESS_1],
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('6000000000000000000');
    });
  });

  describe('getBalanceUpdatedAfterDate', () => {
    const updateDates = [
      new Date('2001-01-01 GMT'),
      new Date('2002-01-01 GMT'),
      new Date('2003-01-01 GMT'),
    ];
    beforeEach(async () => {
      await tokenBalanceRepository.clear();
      await tokenBalanceUpdateRepository.clear();

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

      const balances = await tokenBalanceRepository.save(tokenBalances);

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
      await tokenBalanceRepository.save(pastTokenBalances);

      // Set update_at of balances
      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i];
        await tokenBalanceUpdateRepository.update(
          { address: balance.address },
          { update_at: updateDates[i] },
        );
        balance.update_at = updateDates[i];
        await tokenBalanceRepository.save(balance);
      }
    });

    it('should return balances of specific network - 1', async () => {
      const { balances } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0),
        networks: [2, 3],
      });
      expect(balances).toHaveLength(2);
      expect(balances[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [2],
        balance: '200',
      });
      expect(balances[1]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should return balances of specific network - 2', async () => {
      const { balances } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0),
        network: 3,
      });
      expect(balances).toHaveLength(1);
      expect(balances[0]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should return only balances updated after specific date', async () => {
      // No balance of a user is update after the date
      const { balances } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(updateDates[1].getTime() + 1), // 1ms after update
      });

      expect(balances).toEqual([
        {
          address: TEST_USER_ADDRESS_2,
          networks: [3],
          balance: '500',
          update_at: updateDates[2],
        },
      ]);
    });

    it('should return balance for single chain', async () => {
      const response = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0),
      });

      const { count, balances } = response;
      expect(count).toEqual(2);
      expect(balances).toHaveLength(2);
      expect(balances[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [1, 2],
        balance: '300',
      });
      expect(balances[1]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });
    });

    it('should support pagination', async () => {
      let { count, balances } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0), // 1ms before update
        take: 1,
      });

      expect(count).toEqual(2);
      expect(balances).toHaveLength(1);
      expect(balances[0]).toMatchObject({
        address: TEST_USER_ADDRESS_1,
        networks: [1, 2],
        balance: '300',
      });

      ({ count, balances } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0), // 1ms before update
        take: 1,
        skip: 1,
      }));
      expect(count).toEqual(2);
      expect(balances).toHaveLength(1);
      expect(balances[0]).toMatchObject({
        address: TEST_USER_ADDRESS_2,
        networks: [3],
        balance: '500',
      });

      ({ balances, count } = await controller.getBalanceUpdatedAfterDate({
        date: new Date(0), // 1ms before update
        take: 1,
        skip: 2,
      }));
      expect(count).toEqual(2);
      expect(balances).toHaveLength(0);
    });
  });
});
