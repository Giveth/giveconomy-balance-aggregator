import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GraphqlClientAdapterService {
  async getBalanceChanges(params: {
    subgraphUrl: string;
    contractAddress: string;
    sinceTimestamp: number;
    skip: number;
    take?: number;
  }) {
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
          where: {time_gt: ${sinceTimestamp}, contractAddress: "${contractAddress}"}
        ) {
          id
          time
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
