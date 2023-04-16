import { Module } from '@nestjs/common';
import { BalanceController } from 'src/controller/balance.controller';
import { BalanceService } from 'src/service/balance.service';
import DatabaseModule from 'src/storage/DatabaseModule';

@Module({
  imports: [DatabaseModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class AppModule {}
