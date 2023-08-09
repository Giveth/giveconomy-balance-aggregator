import { Module } from '@nestjs/common';
import { FetchStateModule } from 'src/modules/fetch-state/fetch-state.module';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';
import { SubgraphModule } from 'src/modules/subgraph/subgraph.module';
import { TokenBalanceModule } from 'src/modules/token-balance/token-balance.module';

import { DataFetchAgentService } from './data-fetch-agent.service';
import { LoadBlockchainConfigService } from './load-blockchain-config.service';

@Module({
  imports: [FetchStateModule, SubgraphModule, TokenBalanceModule],
  providers: [
    LoadBlockchainConfigService,
    GraphqlClientAdapterService,
    DataFetchAgentService,
  ],
  exports: [DataFetchAgentService],
})
export class DataFetcherModule {}
