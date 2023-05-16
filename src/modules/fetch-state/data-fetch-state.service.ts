import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SingleFetchConfig } from 'src/modules/data-fetcher/load-blockchain-config.service';
import { DataFetchState } from 'src/modules/fetch-state/data-fetch-state.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DataFetchStateService {
  constructor(
    @InjectRepository(DataFetchState)
    readonly dataFetchStateRepository: Repository<DataFetchState>,
  ) {}

  static getFetchId(fetchConfig: SingleFetchConfig): string {
    return `${fetchConfig.contractAddress.toLowerCase()}-${
      fetchConfig.network
    }`;
  }
  /**
   * Initialize a single balance fetch. It initialize the fetch state and return the fetch id if it doesn't exist.
   * Otherwise, it updates subgraphUrl and returns the existing fetch id.
   * @param fetchConfig
   * @returns fetch id
   */
  async initializeFetchConfig(fetchConfig: SingleFetchConfig): Promise<string> {
    const fetchId = DataFetchStateService.getFetchId(fetchConfig);
    await this.dataFetchStateRepository
      .createQueryBuilder()
      .insert()
      .into(DataFetchState)
      .values({
        id: fetchId,
        contractAddress: fetchConfig.contractAddress.toLowerCase(),
        network: fetchConfig.network,
        lastBlockNumber: 0,
        lastUpdateTime: 0,
        paginationSkip: 0,
      })
      .orIgnore()
      .execute();
    return fetchId;
  }

  async getFetchState(fetchId: string): Promise<DataFetchState> {
    return this.dataFetchStateRepository.findOne({
      where: { id: fetchId },
    });
  }

  async updateLastUpdateTimeAndBlockNumber(
    fetchId: string,
    data: Pick<DataFetchState, 'lastBlockNumber' | 'lastUpdateTime'>,
  ) {
    await this.dataFetchStateRepository.update(
      { id: fetchId },
      { ...data, paginationSkip: 0 },
    );
  }

  async updatePaginationSkip(fetchId: string, paginationSkip: number) {
    await this.dataFetchStateRepository.update(
      { id: fetchId },
      { paginationSkip },
    );
  }
}
