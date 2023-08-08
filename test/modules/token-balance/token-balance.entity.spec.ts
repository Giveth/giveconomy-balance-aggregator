import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { TokenBalanceUpdate } from 'src/modules/token-balance/token-balance.update.entity';
import { getConnectionOptions } from 'test/test-utils';
import { Repository } from 'typeorm';

// Define separate address for testing to avoid conflicts with other tests
const TEST_USER_ADDRESS = '0x000000002';

describe('TokenBalanceRepository', () => {
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
    }).compile();

    tokenBalanceRepository = module.get<Repository<TokenBalance>>(
      getRepositoryToken(TokenBalance),
    );
    tokenBalanceUpdateRepository = module.get<Repository<TokenBalanceUpdate>>(
      getRepositoryToken(TokenBalanceUpdate),
    );

    // clear table
    await tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS });
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create test', () => {
    it('create simple entity', async () => {
      const entity = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      const balance = await tokenBalanceRepository.save(entity);

      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe(TEST_USER_ADDRESS);
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');

      const tokenUpdates = await tokenBalanceUpdateRepository.findOne({
        where: { address: entity.address },
      });

      expect(tokenUpdates).toHaveProperty('id');
      expect(tokenUpdates.address).toBe(TEST_USER_ADDRESS);
      expect(tokenUpdates.update_at.getTime()).toBeCloseTo(
        new Date(new Date().toISOString().slice(0, -1)).getTime(),
        -3,
      );
    });
  });

  describe('constraints test', () => {
    beforeEach(async () => {
      await tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS });
    });
    it('should throw error when address is null', async () => {
      const entity = await tokenBalanceRepository.create({
        address: null,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      await expect(tokenBalanceRepository.save(entity)).rejects.toThrow();
    });

    it('should throw error when network is null', async () => {
      const entity = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: null,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      await expect(tokenBalanceRepository.save(entity)).rejects.toThrow();
    });

    it('should throw error when timeRange overlaps', async () => {
      const entity = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2022-01-01)',
        blockRange: '[1,2000)',
      });
      await tokenBalanceRepository.save(entity);

      const entity2 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2021-12-01,2023-01-01)',
        blockRange: '[2000,4000)',
      });
      await expect(tokenBalanceRepository.save(entity2)).rejects.toThrow();
    });

    it('should throw error when blockRange overlaps', async () => {
      const entity = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2022-01-01)',
        blockRange: '[1,2000)',
      });
      await tokenBalanceRepository.save(entity);

      const entity2 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2022-01-01,2023-01-01)',
        blockRange: '[1000,4000)',
      });
      await expect(tokenBalanceRepository.save(entity2)).rejects.toThrow();
    });
  });

  describe('insert trigger test', () => {
    beforeEach(async () => {
      await tokenBalanceRepository.delete({ address: TEST_USER_ADDRESS });
    });

    it('should close previous balance upper bound when insert new balance', async () => {
      const entity1 = tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1,)',
      });
      let balance1 = await tokenBalanceRepository.save(entity1);

      const entity2 = tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2022-01-01,)',
        blockRange: '[2000,)',
      });
      await tokenBalanceRepository.save(entity2);

      // reload balance1
      balance1 = await tokenBalanceRepository.findOne({
        where: { id: balance1.id },
      });
      const timeRange = balance1.timeRange.replace(/"/g, '');

      // Lower bound must be inclusive
      expect(timeRange[0]).toEqual('[');
      // Upper bound must be exclusive
      expect(timeRange[timeRange.length - 1]).toEqual(')');

      // Lower bound must be equal to previous lower bound and upper bound must be equal to new balance lower bound
      const timeRangeArray = timeRange
        .replace(/[[\]()]/g, '')
        .split(',')
        .map(time => time + ' UTC');

      expect(new Date(timeRangeArray[0])).toEqual(new Date('2021-01-01 UTC'));
      expect(new Date(timeRangeArray[1])).toEqual(new Date('2022-01-01 UTC'));

      // Lower bound of blockRange must be equal to previous lower bound and upper bound must be equal to new balance lower bound
      expect(balance1.blockRange).toEqual('[1,2000)');
    });

    it('should update update_at when insert new balance', async () => {
      await tokenBalanceRepository.save(
        tokenBalanceRepository.create({
          address: TEST_USER_ADDRESS,
          network: 1,
          balance: '1000000000000000000',
          timeRange: '[2021-01-01,)',
          blockRange: '[1,)',
        }),
      );

      await tokenBalanceUpdateRepository.update(
        { address: TEST_USER_ADDRESS },
        { update_at: new Date('2021-01-01') },
      );

      await tokenBalanceRepository.save(
        tokenBalanceRepository.create({
          address: TEST_USER_ADDRESS,
          network: 1,
          balance: '2000000000000000000',
          timeRange: '[2022-01-01,)',
          blockRange: '[2000,)',
        }),
      );
      const tokenBalanceUpdate = await tokenBalanceUpdateRepository.findOne({
        where: { address: TEST_USER_ADDRESS },
      });
      expect(tokenBalanceUpdate).toBeDefined();
      expect(tokenBalanceUpdate.update_at.getTime()).toBeCloseTo(
        new Date(new Date().toISOString().slice(0, -1)).getTime(),
        -3,
      );
    });

    it('should only close previous balance if the new balance lower bound be higher than previous balance lower bound', async () => {
      const entity1 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1000,)',
      });
      await tokenBalanceRepository.save(entity1);

      // check timeRange
      const entity2 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2020-01-01,)',
        blockRange: '[2000,)',
      });
      await expect(tokenBalanceRepository.save(entity2)).rejects.toThrow();

      // check blockRange
      entity2.timeRange = '[2022-01-01,)';
      entity2.blockRange = '[500,)';
      await expect(tokenBalanceRepository.save(entity2)).rejects.toThrow();
    });

    it('should support insert balance with same lower bound - multiple balance changes in single block', async () => {
      const entity1 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1000,)',
      });
      await tokenBalanceRepository.save(entity1);

      // check timeRange
      const entity2 = await tokenBalanceRepository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1000,)',
      });
      await tokenBalanceRepository.save(entity2);

      const balances = await tokenBalanceRepository.find({
        where: { address: TEST_USER_ADDRESS, network: 1 },
        order: { id: 'ASC' },
      });

      expect(balances.length).toEqual(2);
      expect(balances[0].balance).toEqual('1000000000000000000');
      expect(balances[1].balance).toEqual('2000000000000000000');

      expect(balances[0].blockRange).toEqual('empty');
      expect(balances[0].timeRange).toEqual('empty');
    });
  });
});
