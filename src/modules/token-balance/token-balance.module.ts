import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';

import { TokenBalanceController } from './token-balance.controller';
import { TokenBalance } from './token-balance.entity';
import { TokenBalanceService } from './token-balance.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([TokenBalance])],
  providers: [TokenBalanceService],
  controllers: [TokenBalanceController],
  exports: [TokenBalanceService],
})
export class TokenBalanceModule {}
