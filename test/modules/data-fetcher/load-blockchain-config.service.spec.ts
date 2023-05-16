import { Test } from '@nestjs/testing';
import { DataFetcherModule } from 'src/modules/data-fetcher/data-fetcher.module';
import { LoadBlockchainConfigService } from 'src/modules/data-fetcher/load-blockchain-config.service';
import TestConfigureModule from 'test/modules/testConfigure.module';

describe('LoadBlockchainConfigService', () => {
  let service: LoadBlockchainConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestConfigureModule, DataFetcherModule],
    }).compile();

    service = moduleRef.get<LoadBlockchainConfigService>(
      LoadBlockchainConfigService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have blockchain configuration', async () => {
    const config = await service.getBlockchainConfig();
    expect(config).toBeDefined();
    expect(config).toHaveProperty('networks');
    expect(config.networks.length).toBeGreaterThanOrEqual(1);
    expect(config.networks[0]).toEqual({
      name: 'test-network',
      network: 1,
      contractAddress: '0x1111111111111111111111111111111111111111',
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/giveth/test',
      fetchInterval: 5000,
    });
  });
});
