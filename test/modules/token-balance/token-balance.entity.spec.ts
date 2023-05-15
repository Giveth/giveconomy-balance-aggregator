import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { getConnectionOptions } from 'test/test-utils';
import { Repository } from 'typeorm';

// Define separate address for testing to avoid conflicts with other tests
const TEST_USER_ADDRESS = '0x000000002';

describe('TokenBalanceRepository', () => {
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
    }).compile();

    repository = module.get<Repository<TokenBalance>>(
      getRepositoryToken(TokenBalance),
    );

    // clear table
    await repository.delete({ address: TEST_USER_ADDRESS });
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create test', () => {
    it('create simple entity', async () => {
      const entity = await repository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      const balance = await repository.save(entity);

      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe(TEST_USER_ADDRESS);
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');
    });
  });

  describe('constraints test', () => {
    beforeEach(async () => {
      await repository.delete({ address: TEST_USER_ADDRESS });
    });
    it('should throw error when address is null', async () => {
      const entity = await repository.create({
        address: null,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      await expect(repository.save(entity)).rejects.toThrow();
    });

    it('should throw error when network is null', async () => {
      const entity = await repository.create({
        address: TEST_USER_ADDRESS,
        network: null,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      await expect(repository.save(entity)).rejects.toThrow();
    });

    it('should throw error when timeRange overlaps', async () => {
      const entity = await repository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2022-01-01)',
        blockRange: '[1,2000)',
      });
      await repository.save(entity);

      const entity2 = await repository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2021-12-01,2023-01-01)',
        blockRange: '[2000,4000)',
      });
      await expect(repository.save(entity2)).rejects.toThrow();
    });

    it('should throw error when blockRange overlaps', async () => {
      const entity = await repository.create({
        address: TEST_USER_ADDRESS,
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2022-01-01)',
        blockRange: '[1,2000)',
      });
      await repository.save(entity);

      const entity2 = await repository.create({
        address: '0x000000002',
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2022-01-01,2023-01-01)',
        blockRange: '[1000,4000)',
      });
      await expect(repository.save(entity2)).rejects.toThrow();
    });
  });

  describe('insert trigger test', () => {
    beforeEach(async () => {
      await repository.delete({ address: TEST_USER_ADDRESS });
    });

    it('should close previous balance upper bound when insert new balance', async () => {
      const entity1 = await repository.create({
        address: '0x000000002',
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1,)',
      });
      let balance1 = await repository.save(entity1);

      const entity2 = await repository.create({
        address: '0x000000002',
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2022-01-01,)',
        blockRange: '[2000,)',
      });
      await repository.save(entity2);

      // reload balance1
      balance1 = await repository.findOne({ where: { id: balance1.id } });
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

    it('should only close previous balance if the new balance lower bound be higher than previous balance lower bound', async () => {
      const entity1 = await repository.create({
        address: '0x000000002',
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,)',
        blockRange: '[1000,)',
      });
      await repository.save(entity1);

      // check timeRange
      const entity2 = await repository.create({
        address: '0x000000002',
        network: 1,
        balance: '2000000000000000000',
        timeRange: '[2020-01-01,)',
        blockRange: '[2000,)',
      });
      await expect(repository.save(entity2)).rejects.toThrow();

      // check blockRange
      entity2.timeRange = '[2022-01-01,)';
      entity2.blockRange = '[500,)';
      await expect(repository.save(entity2)).rejects.toThrow();
    });
  });
});
