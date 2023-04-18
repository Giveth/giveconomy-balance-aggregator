import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';

import { BalanceController } from './balance.controller';
import { Balance } from './balance.entity';
import { BalanceService } from './balance.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Balance])],
  providers: [BalanceService],
  controllers: [BalanceController],
})
export class BalanceModule {}
