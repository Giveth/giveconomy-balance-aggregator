import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LoadBlockchainConfigService } from './load-blockchain-config.service';

@Module({
  imports: [ConfigModule],
  providers: [LoadBlockchainConfigService],
})
export class DataFetcherModule {}
