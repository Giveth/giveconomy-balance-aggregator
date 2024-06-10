import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';

@Module({
  imports: [ConfigModule],
  providers: [GraphqlClientAdapterService, ConfigService],
  exports: [GraphqlClientAdapterService],
})
export class SubgraphModule {}
