import { Body, Controller, Get, Post } from '@nestjs/common';
import { Balance } from 'src/modules/balance/balance.entity';
import { BalanceService } from 'src/modules/balance/balance.service';

@Controller()
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  findAll(): Promise<Balance[]> {
    return this.balanceService.findAll();
  }

  @Post()
  create(@Body() balance: Balance): Promise<Balance> {
    return this.balanceService.create(balance);
  }
}
