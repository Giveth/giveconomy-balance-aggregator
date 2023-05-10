import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Balance } from 'src/modules/balance/balance.entity';
import { BalanceService } from 'src/modules/balance/balance.service';
import { getConnectionOptions } from 'test/test-utils';

describe('BalanceService', () => {
  let service: BalanceService;

  beforeEach(async () => {
    const options = getConnectionOptions();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...options,
          entities: [Balance],
        }),
        TypeOrmModule.forFeature([Balance]),
      ],

      providers: [BalanceService],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create', () => {
    it('should create a new balance', async () => {
      const balance = await service.create({
        address: '0x123456789',
        network: 1,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,2)',
      });
      expect(balance).toHaveProperty('id');
      expect(balance.address).toBe('0x123456789');
      expect(balance.network).toBe(1);
      expect(balance.balance).toBe('1000000000000000000');
    });
  });

  describe('get balance', () => {
    const baseUserData = {
      address: '0x123456789',
      network: 1,
    };

    beforeEach(async () => {
      await service.balanceRepository.clear();
      // Fill sample data
      await service.create({
        ...baseUserData,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1000,2000)',
      });
      await service.create({
        ...baseUserData,
        balance: '2000000000000000000',
        timeRange: '[2021-01-02,2021-01-03)',
        blockRange: '[2000,3000)',
      });
      await service.create({
        ...baseUserData,
        balance: '3000000000000000000',
        timeRange: '[2021-01-03,)',
        blockRange: '[3000,)',
      });
    });

    it('get simple balance', async () => {
      await service.balanceRepository.clear();
      const data = {
        ...baseUserData,
        balance: '1000000000000000000',
        timeRange: '[2021-01-01,2021-01-02)',
        blockRange: '[1,)',
      };
      await service.create(data);
      const balance = await service.getBalance({
        address: data.address,
        network: data.network,
      });
      expect(balance).not.toBeNull();
      expect(balance).toBeTruthy();
      expect(balance.address).toBe(data.address);
      expect(balance.network).toBe(data.network);
    });

    it('get balance by timestamp and block', async () => {
      let balance = await service.getBalance({
        address: baseUserData.address,
        network: baseUserData.network,
        timestamp: new Date('2021-01-02 GMT').getTime() / 1000,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('2000000000000000000');

      balance = await service.getBalance({
        address: baseUserData.address,
        network: baseUserData.network,
        block: 1533,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('1000000000000000000');
    });

    it('get latest balance when no timestamp or block is provided', async () => {
      const balance = await service.getBalance({
        address: baseUserData.address,
        network: baseUserData.network,
      });
      expect(balance).toBeTruthy();
      expect(balance.balance).toBe('3000000000000000000');
    });
  });
});
