import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';
import { DataFetchStateController } from 'src/modules/fetch-state/data-fetch-state.controller';

import { DataFetchState } from './data-fetch-state.entity';
import { DataFetchStateService } from './data-fetch-state.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([DataFetchState])],
  providers: [DataFetchStateService],
  exports: [DataFetchStateService],
  controllers: [DataFetchStateController],
})
export class FetchStateModule {}
