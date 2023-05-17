import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';

import { DataFetchState } from './data-fetch-state.entity';
import { DataFetchStateService } from './data-fetch-state.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([DataFetchState])],
  providers: [DataFetchStateService],
  exports: [DataFetchStateService],
})
export class FetchStateModule {}
