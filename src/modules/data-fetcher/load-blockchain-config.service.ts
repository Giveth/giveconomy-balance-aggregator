import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as yaml from 'js-yaml';

export type SingleFetchConfig = {
  name: string;
  network: number;
  contractAddress: string;
  subgraphUrl: string;
  fetchInterval: number;
  /**
   * Key for subgraphs on The Graph's decentralised gateway, which rejects
   * unauthenticated queries. Optional: self-hosted subgraphs need none, and a
   * deployment where every network shares one key can set SUBGRAPH_API_KEY
   * instead of repeating it per network.
   */
  subgraphApiKey?: string;
};

export type BlockChainConfig = {
  networks: SingleFetchConfig[];
};

let blockChainConfig: BlockChainConfig = null;

@Injectable()
export class LoadBlockchainConfigService {
  constructor(private readonly configService: ConfigService) {}

  async getBlockchainConfig(): Promise<BlockChainConfig> {
    if (!blockChainConfig) {
      const blockchainConfigFileName = this.configService.get<string>(
        'BLOCKCHAIN_CONFIG_FILE_NAME',
      );
      blockChainConfig = yaml.load(
        readFileSync(
          join(
            __dirname,
            '../../../config/blockchain',
            blockchainConfigFileName,
          ),
          'utf8',
        ),
      ) as BlockChainConfig;
    }

    return blockChainConfig;
  }

  async getSubgraphPaginationLimit(): Promise<number> {
    return Number(
      this.configService.get<number>('SUBGRAPH_PAGINATION_LIMIT') || 4000,
    );
  }
}
