import { Injectable } from '@nestjs/common';
import { isNumber } from '@nestjs/common/utils/shared.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { SubgraphBalanceChangeEntity } from 'src/modules/subgraph/graphql-client-adapter.service';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
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

  private subgraphBalanceChangeToTokenBalance(
    balanceChange: SubgraphBalanceChangeEntity,
    network: number,
  ): TokenBalance {
    const tokenBalance = new TokenBalance();
    tokenBalance.address = balanceChange.account;
    tokenBalance.balance = balanceChange.newBalance;
    tokenBalance.network = network;
    const fromDate = new Date(+balanceChange.time * 1000);
    tokenBalance.timeRange = `[${fromDate.toISOString()},)`;
    tokenBalance.blockRange = `[${balanceChange.block},)`;
    return tokenBalance;
  }

  async saveTokenBalanceFromSubgraphMany(
    balanceChanges: SubgraphBalanceChangeEntity[],
    network: number,
  ): Promise<TokenBalance[]> {
    const tokenBalances = balanceChanges.map(balanceChange =>
      this.subgraphBalanceChangeToTokenBalance(balanceChange, network),
    );
    return this.tokenBalanceRepository.manager.transaction(manager =>
      manager.save(tokenBalances),
    );
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
    networks?: number | number[];
    timestamp?: number;
    block?: number;
  }): Promise<
    | {
        address: string;
        networks: number[];
        balance: string;
      }
    | undefined
  > {
    const { address, networks, timestamp, block } = params;
    let query = this.tokenBalanceRepository
      .createQueryBuilder('tokenBalance')
      .where('tokenBalance.address = :address ', {
        address,
      });

    // add timestamp query if exists
    switch (true) {
      case timestamp !== undefined:
        query = query.andWhere(
          `tokenBalance.timeRange @> to_timestamp(:timestamp) AT TIME ZONE 'UTC'`,
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
    if (isNumber(networks)) {
      query = query.andWhere('tokenBalance.network = :network', {
        network: networks,
      });
    }
    // Multiple networks
    else if (Array.isArray(networks)) {
      query = query.andWhere('tokenBalance.network IN (:...networks)', {
        networks: networks,
      });
    }

    return query
      .select('SUM(tokenBalance.balance)', 'balance')
      .addSelect('tokenBalance.address', 'address')
      .addSelect('ARRAY_AGG(tokenBalance.network)', 'networks')
      .groupBy('tokenBalance.address')
      .getRawOne();
  }
}
