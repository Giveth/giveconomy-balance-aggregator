import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SingleFetchConfig } from 'src/modules/data-fetcher/load-blockchain-config.service';
import { DataFetchState } from 'src/modules/fetch-state/data-fetch-state.entity';
import { DataFetchStateService } from 'src/modules/fetch-state/data-fetch-state.service';
import { getConnectionOptions } from 'test/test-utils';

const FETCH_CONFIG: SingleFetchConfig = {
  name: 'test',
  contractAddress: '0x000000001',
  network: 1,
  subgraphUrl: 'empty',
};

describe('DataFetchStateService', () => {
  let service: DataFetchStateService;

  beforeEach(async () => {
    const options = getConnectionOptions();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...options,
          entities: [DataFetchState],
        }),
        TypeOrmModule.forFeature([DataFetchState]),
      ],

      providers: [DataFetchStateService],
    }).compile();

    service = module.get<DataFetchStateService>(DataFetchStateService);
    await service.dataFetchStateRepository.delete({
      contractAddress: FETCH_CONFIG.contractAddress,
      network: FETCH_CONFIG.network,
    });
  });

  afterEach(async () => {
    // await service.balanceRepository.query('DELETE FROM balance');
  });

  describe('create', () => {
    beforeEach(async () => {
      await service.dataFetchStateRepository.delete({
        contractAddress: FETCH_CONFIG.contractAddress,
        network: FETCH_CONFIG.network,
      });
    });

    it('should create with correct id', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      expect(id).toBeDefined();
      const state = await service.dataFetchStateRepository.findOne({
        where: { id },
      });
      expect(state).toBeDefined();
      expect(state).toEqual({
        id: FETCH_CONFIG.contractAddress + '-' + FETCH_CONFIG.network,
        contractAddress: FETCH_CONFIG.contractAddress,
        network: FETCH_CONFIG.network,
        lastUpdateTime: 0,
        lastBlockNumber: 0,
        paginationSkip: 0,
      });
    });

    it('should not create if already exists', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      await service.dataFetchStateRepository.update(
        { id: id },
        { lastUpdateTime: 1000, lastBlockNumber: 200, paginationSkip: 300 },
      );
      const id2 = await service.initializeFetchConfig(FETCH_CONFIG);
      expect(id).toEqual(id2);
      const state = await service.dataFetchStateRepository.find({
        where: { id },
      });
      expect(state).toHaveLength(1);
      expect(state[0]).toEqual({
        id: FETCH_CONFIG.contractAddress + '-' + FETCH_CONFIG.network,
        contractAddress: FETCH_CONFIG.contractAddress,
        network: FETCH_CONFIG.network,
        lastUpdateTime: 1000,
        lastBlockNumber: 200,
        paginationSkip: 300,
      });
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await service.dataFetchStateRepository.delete({
        contractAddress: FETCH_CONFIG.contractAddress,
        network: FETCH_CONFIG.network,
      });
    });

    it('should reset paginationSkip on time and block update', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      await service.dataFetchStateRepository.update(
        { id: id },
        { lastUpdateTime: 1000, lastBlockNumber: 200, paginationSkip: 300 },
      );

      await service.updateLastUpdateTimeAndBlockNumber(id, {
        lastUpdateTime: 2000,
        lastBlockNumber: 400,
      });
      const state = await service.dataFetchStateRepository.findOne({
        where: { id: id },
      });
      expect(state).toBeDefined();
      expect(state.lastUpdateTime).toEqual(2000);
      expect(state.lastBlockNumber).toEqual(400);
      expect(state.paginationSkip).toEqual(0);
    });

    it('should update paginationSkip without touching time and block', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      await service.dataFetchStateRepository.update(
        { id: id },
        { lastUpdateTime: 1000, lastBlockNumber: 200, paginationSkip: 300 },
      );

      await service.updatePaginationSkip(id, 500);
      const state = await service.dataFetchStateRepository.findOne({
        where: { id: id },
      });
      expect(state).toBeDefined();
      expect(state.lastUpdateTime).toEqual(1000);
      expect(state.lastBlockNumber).toEqual(200);
      expect(state.paginationSkip).toEqual(500);
    });
  });

  describe('get', () => {
    it('should return undefined if not found', async () => {
      const state = await service.getFetchState('0x000000001' + '-' + '1');
      expect(state).toBeFalsy();
    });

    it('should return state if found', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      const state = await service.getFetchState(id);
      expect(state).toBeDefined();
      expect(state).toEqual({
        id: FETCH_CONFIG.contractAddress + '-' + FETCH_CONFIG.network,
        contractAddress: FETCH_CONFIG.contractAddress,
        network: FETCH_CONFIG.network,
        lastUpdateTime: 0,
        lastBlockNumber: 0,
        paginationSkip: 0,
      });
    });
  });
});
