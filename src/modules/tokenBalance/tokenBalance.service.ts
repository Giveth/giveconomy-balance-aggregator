import { Injectable } from '@nestjs/common';
import { isNumber } from '@nestjs/common/utils/shared.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenBalance } from 'src/modules/tokenBalance/tokenBalance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TokenBalanceService {
  constructor(
    @InjectRepository(TokenBalance)
    readonly tokenBalanceRepository: Repository<TokenBalance>,
  ) {}

  async findAll(): Promise<TokenBalance[]> {
    return this.tokenBalanceRepository.find();
  }

  async create(tokenBalance: Partial<TokenBalance>): Promise<TokenBalance> {
    return this.tokenBalanceRepository.save(tokenBalance);
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
    let query = this.tokenBalanceRepository
      .createQueryBuilder('tokenBalance')
      .where('tokenBalance.address = :address ', {
        address,
      });

    // add timestamp query if exists
    switch (true) {
      case timestamp !== undefined:
        query = query.andWhere(
          `tokenBalance.timeRange @> to_timestamp(:timestamp)`,
          {
            timestamp: Math.floor(timestamp),
          },
        );
        break;

      case block !== undefined:
        query = query.andWhere(
          `tokenBalance.blockRange @> ${Math.floor(block)}`,
        );
        break;

      default:
        query = query.andWhere('upper_inf(tokenBalance.blockRange)');
    }

    // Single network
    if (isNumber(network)) {
      return query
        .andWhere('tokenBalance.network = :network', {
          network,
        })
        .getOne();
    }

    // Multiple networks
    else {
      if (Array.isArray(network)) {
        query = query.andWhere('tokenBalance.network IN (:...networks)', {
          networks: network,
        });
      }
      return query
        .select('SUM(tokenBalance.balance)', 'balanceSum')
        .addSelect(['tokenBalance.address'])
        .groupBy('tokenBalance.address')
        .getRawOne();
    }
  }
}
