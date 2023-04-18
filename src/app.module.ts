import { Module } from '@nestjs/common';
import { BalanceController } from 'src/modules/balance/balance.controller';
import { BalanceService } from 'src/modules/balance/balance.service';
import ConfigureModule from 'src/modules/configure.module';
import { DatabaseModule } from 'src/modules/database.module';

@Module({
  imports: [ConfigureModule, DatabaseModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class AppModule {}
