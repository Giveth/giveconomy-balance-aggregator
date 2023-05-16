import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataFetchState } from 'src/modules/data-fetcher/data-fetch-state.entity';
import { DatabaseModule } from 'src/modules/database.module';

import { DataFetchStateService } from './data-fetch-state.service';
import { GraphqlClientAdapterService } from './graphql-client-adapter.service';
import { LoadBlockchainConfigService } from './load-blockchain-config.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([DataFetchState]),
  ],
  providers: [
    LoadBlockchainConfigService,
    DataFetchStateService,
    GraphqlClientAdapterService,
  ],
})
export class DataFetcherModule {}
