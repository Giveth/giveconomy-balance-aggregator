import { Module } from '@nestjs/common';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';

@Module({
  imports: [],
  providers: [GraphqlClientAdapterService],
})
export class SubgraphModule {}
