import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/modules/database.module';
import { TokenBalanceController } from 'src/modules/tokenBalance/tokenBalance.controller';
import { TokenBalanceService } from 'src/modules/tokenBalance/tokenBalance.service';

import { TokenBalance } from './tokenBalance.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([TokenBalance])],
  providers: [TokenBalanceService],
  controllers: [TokenBalanceController],
})
export class TokenBalanceModule {}
