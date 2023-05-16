import { Injectable } from '@nestjs/common';
import { config } from 'rxjs';
import {
  LoadBlockchainConfigService,
  SingleFetchConfig,
} from 'src/modules/data-fetcher/load-blockchain-config.service';
import { DataFetchStateService } from 'src/modules/fetch-state/data-fetch-state.service';
import {
  GraphqlClientAdapterService,
  SubgraphBalanceChangeEntity,
} from 'src/modules/subgraph/graphql-client-adapter.service';
import { TokenBalanceService } from 'src/modules/token-balance/token-balance.service';

@Injectable()
export class DataFetchAgentService {
  constructor(
    readonly dataFetchStateService: DataFetchStateService,
    readonly loadBlockChainConfigService: LoadBlockchainConfigService,
    readonly tokenBalanceService: TokenBalanceService,
  ) {}

  async fetchAll() {
    const blockChainConfig =
      await this.loadBlockChainConfigService.getBlockchainConfig();
    for (const fetchConfig of blockChainConfig.networks) {
      const fetchId = await this.dataFetchStateService.initializeFetchConfig(
        fetchConfig,
      );
      // await this.fetch(fetchId, fetchConfig);
    }
  }
}

class FetchAgent {
  isRunning = false;
  fetchId: string;
  constructor(
    readonly fetchConfig: SingleFetchConfig,
    readonly dataFetchStateService: DataFetchStateService,
    readonly graphqlClientAdapterService: GraphqlClientAdapterService,
    readonly tokenBalanceService: TokenBalanceService,
  ) {}

  async run() {
    console.info(`Start fetch - config: ${JSON.stringify(this.fetchConfig)}`);
    this.fetchId = await this.dataFetchStateService.initializeFetchConfig(
      this.fetchConfig,
    );

    setInterval(() => {
      this.fetch();
    }, this.fetchConfig.fetchInterval);
  }

  async fetch() {
    // Previous fetch is still running
    if (this.isRunning) {
      console.debug(`Fetch id ${this.fetchId} is still running`);
      return;
    }

    try {
      this.isRunning = true;
      const fetchState = await this.dataFetchStateService.getFetchState(
        this.fetchId,
      );
      const { lastUpdateTime, paginationSkip } = fetchState;
      const { subgraphUrl, contractAddress } = this.fetchConfig;
      let latestBalanceChange: SubgraphBalanceChangeEntity;
      let skip = paginationSkip;
      let result: SubgraphBalanceChangeEntity[];

      do {
        result = await this.graphqlClientAdapterService.getBalanceChanges({
          subgraphUrl,
          contractAddress,
          sinceTimestamp: lastUpdateTime,
          skip,
        });
        if (result.length === 0) {
          // Update last update time and block number and reset pagination skip
          if (latestBalanceChange) {
            console.debug(
              `Fetching completed. Fetch id ${this.fetchId}, last update time ${latestBalanceChange.time}`,
            );
            await this.dataFetchStateService.updateLastUpdateTimeAndBlockNumber(
              this.fetchId,
              {
                lastUpdateTime: +latestBalanceChange.time,
                lastBlockNumber: +latestBalanceChange.block,
              },
            );
          } else {
            await this.dataFetchStateService.updatePaginationSkip(
              this.fetchId,
              0,
            );
          }
          break;
        }
        latestBalanceChange = result[result.length - 1];

        await this.tokenBalanceService.saveTokenBalanceFromSubgraphMany(
          result,
          this.fetchConfig.network,
        );

        skip += result.length;
        await this.dataFetchStateService.updatePaginationSkip(
          this.fetchId,
          skip,
        );
      } while (result.length);
    } catch (e) {
      console.error(`Error on fetch id ${this.fetchId} - `, e);
    } finally {
      this.isRunning = false;
    }
  }
}
