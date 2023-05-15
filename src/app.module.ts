import { Module } from '@nestjs/common';
import ConfigureModule from 'src/modules/configure.module';
import { DataFetcherModule } from 'src/modules/data-fetcher/data-fetcher.module';
import { TokenBalanceModule } from 'src/modules/token-balance/token-balance.module';

@Module({
  imports: [ConfigureModule, TokenBalanceModule, DataFetcherModule],
})
export class AppModule {}
