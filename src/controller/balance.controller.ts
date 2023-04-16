import { Body, Controller, Get, Post } from '@nestjs/common';
import { BalanceService } from 'src/service/balance.service';
import { Balance } from 'src/storage/Entities/Balance';

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
