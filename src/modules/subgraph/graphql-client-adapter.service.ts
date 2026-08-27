import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private origin;
  private defaultApiKey: string;
  constructor(readonly configService: ConfigService) {
    this.origin =
      this.configService.get<string>('SUBGRAPH_DOMAIN') || 'https://giveth.io';
    // The Graph's decentralised gateway rejects unauthenticated queries, so a
    // subgraph hosted there needs a key. Per-network config wins; this is the
    // fallback for deployments where every network shares one key.
    this.defaultApiKey =
      this.configService.get<string>('SUBGRAPH_API_KEY') || '';
  }
  async getBalanceChanges(params: {
    subgraphUrl: string;
    contractAddress: string;
    sinceTimestamp: number;
    skip: number;
    take?: number;
    subgraphApiKey?: string;
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
      subgraphApiKey,
    } = params;
    const apiKey = subgraphApiKey || this.defaultApiKey;

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

    const result = await axios.post(
      subgraphUrl,
      { query },
      {
        headers: {
          Origin: this.origin,
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      },
    );

    // The gateway answers auth and query failures with HTTP 200 and an
    // `errors` array, so axios does not throw. Destructuring `result.data.data`
    // blind turns that into "Cannot destructure property ... of undefined",
    // which the fetch loop logs and retries forever — a network can sit frozen
    // for months behind that message. Surface what the subgraph actually said.
    const errors = result.data?.errors;
    if (errors?.length) {
      const detail = errors
        .map((error: { message?: string }) => error?.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(
        `Subgraph query failed for ${subgraphUrl}: ${
          detail || 'unknown error'
        }` +
          (apiKey ? '' : ' (no SUBGRAPH_API_KEY configured for this network)'),
      );
    }

    const payload = result.data?.data;
    if (!payload) {
      throw new Error(
        `Subgraph returned no data for ${subgraphUrl} (HTTP ${result.status})`,
      );
    }

    const { balanceChanges, _meta } = payload;
    return {
      balanceChanges,
      block: _meta.block,
    };
  }
}
