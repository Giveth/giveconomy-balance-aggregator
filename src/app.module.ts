import { Module } from '@nestjs/common';
import ConfigureModule from 'src/modules/configure.module';
import { TokenBalanceModule } from 'src/modules/tokenBalance/tokenBalance.module';

@Module({
  imports: [ConfigureModule, TokenBalanceModule],
})
export class AppModule {}
