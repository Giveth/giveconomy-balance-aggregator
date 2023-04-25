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
});
