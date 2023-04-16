import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Balance } from 'src/storage/Entities/Balance';
import { Repository } from 'typeorm';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(Balance)
    private readonly balanceRepository: Repository<Balance>,
  ) {}

  async findAll(): Promise<Balance[]> {
    return this.balanceRepository.find();
  }

  async create(balance: Balance): Promise<Balance> {
    return this.balanceRepository.save(balance);
  }
}
