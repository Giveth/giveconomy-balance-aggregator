import { Injectable, Logger } from '@nestjs/common';
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
  private logger = new Logger(DataFetchAgentService.name);
  constructor(
    readonly dataFetchStateService: DataFetchStateService,
    readonly loadBlockChainConfigService: LoadBlockchainConfigService,
    readonly tokenBalanceService: TokenBalanceService,
    readonly graphqlClientAdapterService: GraphqlClientAdapterService,
  ) {}

  async startFetch() {
    const blockChainConfig =
      await this.loadBlockChainConfigService.getBlockchainConfig();
    Promise.all(
      blockChainConfig.networks.map(fetchConfig => {
        const fetchAgent = new FetchAgent(
          fetchConfig,
          this.dataFetchStateService,
          this.graphqlClientAdapterService,
          this.tokenBalanceService,
        );
        return fetchAgent.run();
      }),
    )
      .then(() => {
        this.logger.log('All fetch agents are running');
      })
      .catch(err => {
        this.logger.error('Error when starting fetch agents', err);
      });
  }
}

class FetchAgent {
  isRunning = false;
  fetchId: string;
  private logger = new Logger(FetchAgent.name);
  constructor(
    readonly fetchConfig: SingleFetchConfig,
    readonly dataFetchStateService: DataFetchStateService,
    readonly graphqlClientAdapterService: GraphqlClientAdapterService,
    readonly tokenBalanceService: TokenBalanceService,
  ) {}

  async run() {
    this.logger.log(
      `Start fetch - config: ${JSON.stringify(this.fetchConfig)}`,
    );
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
      this.logger.debug(`Fetch id ${this.fetchId} is still running`);
      return;
    }

    this.logger.debug('Fetching id ' + this.fetchId);

    try {
      this.isRunning = true;
      const fetchState = await this.dataFetchStateService.getFetchState(
        this.fetchId,
      );
      const { lastUpdateTime, paginationSkip } = fetchState;
      const { subgraphUrl, contractAddress } = this.fetchConfig;
      let latestBalanceChange: SubgraphBalanceChangeEntity;
      const take = 100;
      let skip = paginationSkip;
      let result: SubgraphBalanceChangeEntity[];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        result = await this.graphqlClientAdapterService.getBalanceChanges({
          subgraphUrl,
          contractAddress,
          sinceTimestamp: lastUpdateTime,
          skip,
          take,
        });
        if (result.length > 0) {
          latestBalanceChange = result[result.length - 1];

          await this.tokenBalanceService.saveTokenBalanceFromSubgraphMany(
            result,
            this.fetchConfig.network,
          );
          this.logger.debug(
            `Fetched ${result.length} for id ${this.fetchId} and persisted`,
          );

          skip += result.length;
          await this.dataFetchStateService.updatePaginationSkip(
            this.fetchId,
            skip,
          );
        }

        if (result.length < take) {
          // Update last update time and block number and reset pagination skip
          if (latestBalanceChange) {
            this.logger.debug(
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
      }
    } catch (e) {
      this.logger.error(`Error on fetch id ${this.fetchId} - `, e);
    } finally {
      this.isRunning = false;
    }
  }
}
