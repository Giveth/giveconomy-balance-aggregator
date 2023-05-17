import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TokenBalanceController } from 'src/modules/token-balance/token-balance.controller';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';
import { getConnectionOptions } from 'test/test-utils';
import { Repository } from 'typeorm';

const TEST_USER_ADDRESS = '0x1111111111111111111111111111111111111111';

describe('tokenBalanceController test cases', () => {
  let controller: TokenBalanceController;
  let repository: Repository<TokenBalance>;

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
      controllers: [TokenBalanceController],
    }).compile();

    controller = module.get<TokenBalanceController>(TokenBalanceController);
    repository = module.get<Repository<TokenBalance>>(
      getRepositoryToken(TokenBalance),
    );
  });

  describe('getBalance simple', () => {
    beforeEach(async () => {
      await repository.delete({ address: TEST_USER_ADDRESS });
    });

    it('should return null when no balance', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        networks: 1,
      });
      expect(result).toBeNull();
    });
  });
  describe('getBalance on timestamp', () => {
    const oldTimestamp = Math.floor(new Date('2012-01-01').getTime() / 1000);
    beforeEach(async () => {
      await repository.delete({ address: TEST_USER_ADDRESS });
      await repository.save(
        repository.create(
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
                address: TEST_USER_ADDRESS,
                timeRange: '[2011-01-01,)',
                blockRange: '[1,)',
              },
              {
                network,
                balance: balance2,
                address: TEST_USER_ADDRESS,
                timeRange: '[2021-01-01,)',
                blockRange: '[1,)',
              },
            ])
            .flat(),
        ),
      );
    });

    it('should return balance for single chain', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        networks: 2,
      });
      expect(result.balance).toBe('5000000000000000000');
    });

    it('should return balance for multiple chains', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        networks: [1, 3],
      });
      expect(result.balance).toBe('10000000000000000000');
    });

    it('should return balance for all chains when chain is not specified', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
      });
      expect(result.balance).toBe('15000000000000000000');
    });

    it('should return balance for single chain on old timestamp', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        networks: 2,
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('2000000000000000000');
    });

    it('should return balance for multiple chains on old timestamp', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        networks: [1, 3],
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('4000000000000000000');
    });

    it('should return balance for all chains when chain is not specified on old timestamp', async () => {
      const result = await controller.getBalanceByTimestamp({
        address: TEST_USER_ADDRESS,
        timestamp: oldTimestamp,
      });
      expect(result.balance).toBe('6000000000000000000');
    });
  });
});
