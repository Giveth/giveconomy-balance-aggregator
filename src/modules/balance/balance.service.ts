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

  /**
   *
   * @param params {
   *   address: string;
   *   network: number;
   *   timestamp?: number; // seconds since epoch
   *   block?: number; // block number
   * }
   */
  async getBalance(params: {
    address: string;
    network: number;
    timestamp?: number;
    block?: number;
  }): Promise<Balance> {
    const { address, network, timestamp, block } = params;
    let query = this.balanceRepository
      .createQueryBuilder('balance')
      .where('balance.address = :address and balance.network = :network', {
        address,
        network,
      });
    // add timestamp query if exists

    switch (true) {
      case timestamp !== undefined:
        query = query.andWhere(
          `balance.timeRange @> to_timestamp(:timestamp)`,
          {
            timestamp: Math.floor(timestamp),
          },
        );
        break;

      case block !== undefined:
        query = query.andWhere(`balance.blockRange @> ${Math.floor(block)}`);
        break;

      default:
        query = query.andWhere('upper_inf(balance.blockRange)');
    }

    return query.getOne();
  }
}
