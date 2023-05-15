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
}
