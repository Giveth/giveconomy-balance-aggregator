import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';

import { LoadBlockchainConfigService } from './load-blockchain-config.service';

@Module({
  imports: [ConfigModule],
  providers: [LoadBlockchainConfigService, GraphqlClientAdapterService],
})
export class DataFetcherModule {}
