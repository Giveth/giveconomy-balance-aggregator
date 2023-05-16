import { Injectable } from '@nestjs/common';
import axios from 'axios';

export type SubgraphBalanceChangeEntity = {
  id: string;
  time: string;
  block: string;
  newBalance: string;
  amount: string;
  account: string;
  contractAddress: string;
};
@Injectable()
export class GraphqlClientAdapterService {
  async getBalanceChanges(params: {
    subgraphUrl: string;
    contractAddress: string;
    sinceTimestamp: number;
    skip: number;
    take?: number;
  }): Promise<SubgraphBalanceChangeEntity[]> {
    const {
      sinceTimestamp,
      take = 50,
      skip,
      contractAddress,
      subgraphUrl,
    } = params;

    const query = `query {
        balanceChanges(
          first: ${take}
          skip: ${skip}
          orderBy: id
          orderDirection: asc
          where: {time_gt: ${sinceTimestamp}, contractAddress: "${contractAddress.toLowerCase()}"}
        ) {
          id
          time
          block
          newBalance
          amount
          account
          contractAddress
        }
      }
      `;

    const result = await axios.post(subgraphUrl, { query });
    return result.data.data.balanceChanges;
  }
}
