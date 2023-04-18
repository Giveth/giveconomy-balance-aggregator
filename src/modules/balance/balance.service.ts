import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Balance } from 'src/modules/balance/balance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(Balance)
    readonly balanceRepository: Repository<Balance>,
  ) {}

  async findAll(): Promise<Balance[]> {
    return this.balanceRepository.find();
  }

  async create(balance: Partial<Balance>): Promise<Balance> {
    return this.balanceRepository.save(balance);
  }

  async getBalance(address: string, network: number): Promise<Balance> {
    return this.balanceRepository.findOneOrFail({
      where: {
        address,
        network,
      },
    });
  }
}
