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
  fetchInterval: 5000,
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
    await service.dataFetchStateRepository.clear();
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
        latestIndexedBlockNumber: 0,
        latestIndexedBlockTimestamp: 0,
        isActive: true,
      });
    });

    it('should not create if already exists', async () => {
      const id = await service.initializeFetchConfig(FETCH_CONFIG);
      await service.dataFetchStateRepository.update(
        { id: id },
        {
          lastUpdateTime: 1000,
          lastBlockNumber: 200,
          paginationSkip: 300,
          latestIndexedBlockNumber: 888,
          latestIndexedBlockTimestamp: 9999,
        },
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
        latestIndexedBlockNumber: 888,
        latestIndexedBlockTimestamp: 9999,
        isActive: true,
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
        latestIndexedBlockNumber: 0,
        latestIndexedBlockTimestamp: 0,
        isActive: true,
      });
    });
  });

  describe('getLeastIndexedBlockNumber', () => {
    const FETCH_CONFIG2: SingleFetchConfig = {
      ...FETCH_CONFIG,
      contractAddress: '0x000000002',
      network: 2,
    };
    const FETCH_CONFIG3: SingleFetchConfig = {
      ...FETCH_CONFIG,
      contractAddress: '0x000000022',
      network: 2,
    };
    const FETCH_CONFIG4: SingleFetchConfig = {
      ...FETCH_CONFIG,
      contractAddress: '0x000000004',
      network: 4,
    };

    let id_1, id_2, id_3, id_4;
    beforeEach(async () => {
      id_1 = await service.initializeFetchConfig(FETCH_CONFIG);
      id_2 = await service.initializeFetchConfig(FETCH_CONFIG2);
      id_3 = await service.initializeFetchConfig(FETCH_CONFIG3);
      id_4 = await service.initializeFetchConfig(FETCH_CONFIG4);

      await service.dataFetchStateRepository.update(
        { id: id_1 },
        { latestIndexedBlockNumber: 100, latestIndexedBlockTimestamp: 1000 },
      );
      await service.dataFetchStateRepository.update(
        { id: id_2 },
        { latestIndexedBlockNumber: 200, latestIndexedBlockTimestamp: 2000 },
      );
      await service.dataFetchStateRepository.update(
        { id: id_3 },
        { latestIndexedBlockNumber: 300, latestIndexedBlockTimestamp: 3000 },
      );
    });

    it('should return 0 if no state found', async () => {
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp(5);
      expect(leastIndexedBlockNumber).toEqual(0);
    });

    it('should return correct for single network', async () => {
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp(FETCH_CONFIG.network);
      expect(leastIndexedBlockNumber).toEqual(1000);
    });

    it('should return 0 on initialized state', async () => {
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp(FETCH_CONFIG4.network);
      expect(leastIndexedBlockNumber).toEqual(0);
    });

    it('should return correct for multiple networks', async () => {
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp([
          FETCH_CONFIG.network,
          FETCH_CONFIG3.network,
        ]);
      expect(leastIndexedBlockNumber).toEqual(1000);
    });

    it('should return correct when no network is specified', async () => {
      await service.dataFetchStateRepository.update(
        { id: id_1 },
        { latestIndexedBlockNumber: 800, latestIndexedBlockTimestamp: 8000 },
      );
      await service.dataFetchStateRepository.update(
        { id: id_4 },
        { latestIndexedBlockNumber: 900, latestIndexedBlockTimestamp: 9000 },
      );
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp();
      expect(leastIndexedBlockNumber).toEqual(2000);
    });

    it('should return 0 when no state is found', async () => {
      await service.dataFetchStateRepository.clear();
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp();
      expect(leastIndexedBlockNumber).toEqual(0);
    });

    it('should only return active ones', async () => {
      await service.resetFetchStatesActiveStatus();
      const expectedvalue = 54343423;
      await service.dataFetchStateRepository.update(
        { id: id_3 },
        {
          isActive: true,
          latestIndexedBlockTimestamp: expectedvalue,
        },
      );
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp();
      expect(leastIndexedBlockNumber).toEqual(expectedvalue);
    });

    it('should return 0 when no active state is found', async () => {
      await service.resetFetchStatesActiveStatus();
      const leastIndexedBlockNumber =
        await service.getLeastIndexedBlocksTimestamp();
      expect(leastIndexedBlockNumber).toEqual(0);
    });
  });
});
