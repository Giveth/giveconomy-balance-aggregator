import { Body, Controller, Get, Post } from '@nestjs/common';
import { TokenBalance } from 'src/modules/tokenBalance/tokenBalance.entity';
import { TokenBalanceService } from 'src/modules/tokenBalance/tokenBalance.service';

@Controller()
export class TokenBalanceController {
  constructor(private readonly tokenBalanceService: TokenBalanceService) {}

  @Get()
  findAll(): Promise<TokenBalance[]> {
    return this.tokenBalanceService.findAll();
  }

  @Post()
  create(@Body() balance: TokenBalance): Promise<TokenBalance> {
    return this.tokenBalanceService.create(balance);
  }
}
