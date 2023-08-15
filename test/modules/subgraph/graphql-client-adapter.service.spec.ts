import { Test } from '@nestjs/testing';
import { DataFetcherModule } from 'src/modules/data-fetcher/data-fetcher.module';
import {
  LoadBlockchainConfigService,
  SingleFetchConfig,
} from 'src/modules/data-fetcher/load-blockchain-config.service';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';
import TestConfigureModule from 'test/modules/testConfigure.module';

describe.skip('GraphqlClientAdapterService', () => {
  let service: GraphqlClientAdapterService;
  let config: SingleFetchConfig;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestConfigureModule, DataFetcherModule],
    }).compile();

    service = moduleRef.get<GraphqlClientAdapterService>(
      GraphqlClientAdapterService,
    );
    const loadBlockchainConfigService: LoadBlockchainConfigService =
      moduleRef.get<LoadBlockchainConfigService>(LoadBlockchainConfigService);
    const blockChainConfigs =
      await loadBlockchainConfigService.getBlockchainConfig();
    config = blockChainConfigs.networks.find(c => c.name === 'test-graphql');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(config).toBeDefined();
  });

  it('should fetch sample balance changes', async () => {
    expect(config).toBeDefined();
    const { balanceChanges, block } = await service.getBalanceChanges({
      subgraphUrl: config.subgraphUrl,
      contractAddress: config.contractAddress,
      sinceTimestamp: 0,
      skip: 0,
      take: 5,
    });

    expect(balanceChanges).toBeDefined();
    expect(balanceChanges).toHaveLength(5);
    balanceChanges.forEach(balanceChange => {
      // to have properties id, time,newBalance,amount,account,contractAddress
      expect(balanceChange).toHaveProperty('id');
      expect(balanceChange).toHaveProperty('time');
      expect(balanceChange).toHaveProperty('block');
      expect(balanceChange).toHaveProperty('newBalance');
      expect(balanceChange).toHaveProperty('amount');
      expect(balanceChange).toHaveProperty('account');
      expect(balanceChange).toHaveProperty('contractAddress');
    });

    expect(block).toBeDefined();
    expect(block).toHaveProperty('number');
    expect(block).toHaveProperty('timestamp');
    expect(block.number).toBeGreaterThan(0);
    expect(block.timestamp).toBeGreaterThan(0);
  });

  it('should fetch balance changes are sorted by time', async () => {
    const { balanceChanges } = await service.getBalanceChanges({
      subgraphUrl: config.subgraphUrl,
      contractAddress: config.contractAddress,
      sinceTimestamp: 0,
      skip: 0,
      take: 100,
    });

    expect(balanceChanges).toBeDefined();
    expect(balanceChanges.length).toBeGreaterThan(10);

    const ids = balanceChanges.map(balanceChange => balanceChange.id);
    const times = balanceChanges.map(balanceChange => balanceChange.time);

    expect(ids).toEqual(ids.sort());
    expect(times).toEqual(times.sort());
  });
});
