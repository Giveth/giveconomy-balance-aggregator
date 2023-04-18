import { Module } from '@nestjs/common';
import { BalanceModule } from 'src/modules/balance/balance.module';
import ConfigureModule from 'src/modules/configure.module';

@Module({
  imports: [ConfigureModule, BalanceModule],
})
export class AppModule {}
