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
  }): Promise<{
    balanceChanges: SubgraphBalanceChangeEntity[];
    block: { timestamp: number; number: number };
  }> {
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
        
        _meta {
          block {
            number
            timestamp
          }
        }
      }
      `;

    const result = await axios.post(subgraphUrl, { query });
    const { balanceChanges, _meta } = result.data.data;
    return {
      balanceChanges,
      block: _meta.block,
    };
  }
}
