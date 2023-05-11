import { Injectable } from '@nestjs/common';
import { isNumber } from '@nestjs/common/utils/shared.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenBalance } from 'src/modules/tokenBalance/tokenBalance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TokenBalanceService {
  constructor(
    @InjectRepository(TokenBalance)
    readonly balanceRepository: Repository<TokenBalance>,
  ) {}

  async findAll(): Promise<TokenBalance[]> {
    return this.balanceRepository.find();
  }

  async create(balance: Partial<TokenBalance>): Promise<TokenBalance> {
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
  async getBalanceSingleUser(params: {
    address: string;
    network?: number | number[];
    timestamp?: number;
    block?: number;
  }): Promise<{
    address: string;
    network?: number;
    balance?: string;
    balanceSum?: string;
  }> {
    const { address, network, timestamp, block } = params;
    let query = this.balanceRepository
      .createQueryBuilder('balance')
      .where('balance.address = :address ', {
        address,
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

    // Single network
    if (isNumber(network)) {
      query = query
        .andWhere('balance.network = :network', {
          network,
        })
        .addSelect(['balance.balance', 'balance.network']);
    } else {
      // Multiple networks
      if (!Array.isArray(network)) {
        query = query.andWhere('balance.network IN (:...networks)', {
          networks: network,
        });
      }
      query = query
        .addSelect('SUM(balance.balance)', 'balanceSum')
        .groupBy('address');
    }

    return query.getOne();
  }
}
