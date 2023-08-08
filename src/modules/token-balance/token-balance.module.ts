import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';

import { TokenBalanceController } from './token-balance.controller';
import { TokenBalance } from './token-balance.entity';
import { TokenBalanceService } from './token-balance.service';
import { TokenBalanceUpdate } from './token-balance.update.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([TokenBalance, TokenBalanceUpdate]),
  ],
  providers: [TokenBalanceService],
  controllers: [TokenBalanceController],
  exports: [TokenBalanceService],
})
export class TokenBalanceModule {}
