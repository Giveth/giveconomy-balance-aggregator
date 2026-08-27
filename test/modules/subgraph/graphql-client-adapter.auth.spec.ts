import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GraphqlClientAdapterService } from 'src/modules/subgraph/graphql-client-adapter.service';

/**
 * The Graph's decentralised gateway rejects unauthenticated queries, and it
 * does so with HTTP 200 plus an `errors` array rather than a 4xx. That
 * combination is what let a network sit frozen for months: axios did not
 * throw, `result.data.data` was undefined, and the destructure failed with
 * "Cannot destructure property ..." which the fetch loop logged and retried
 * forever.
 */

jest.mock('axios');
const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

const makeService = (env: Record<string, string> = {}) =>
  new GraphqlClientAdapterService({
    get: (key: string) => env[key],
  } as unknown as ConfigService);

const params = {
  subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/abc',
  contractAddress: '0xAbC0000000000000000000000000000000000001',
  sinceTimestamp: 0,
  skip: 0,
  take: 5,
};

const okResponse = {
  status: 200,
  data: {
    data: {
      balanceChanges: [{ id: '1', time: '10' }],
      _meta: { block: { number: 42, timestamp: 1700 } },
    },
  },
};

const headersOf = (call: number) =>
  (mockedPost.mock.calls[call][2] as { headers: Record<string, string> })
    .headers;

beforeEach(() => {
  mockedPost.mockReset();
  mockedPost.mockResolvedValue(okResponse as never);
});

describe('GraphqlClientAdapterService subgraph authentication', () => {
  it('sends the per-network key as a bearer token', async () => {
    await makeService().getBalanceChanges({
      ...params,
      subgraphApiKey: 'network-key',
    });

    expect(headersOf(0).Authorization).toBe('Bearer network-key');
  });

  it('falls back to SUBGRAPH_API_KEY when the network has no key', async () => {
    await makeService({ SUBGRAPH_API_KEY: 'global-key' }).getBalanceChanges(
      params,
    );

    expect(headersOf(0).Authorization).toBe('Bearer global-key');
  });

  it('prefers the per-network key over the global one', async () => {
    await makeService({ SUBGRAPH_API_KEY: 'global-key' }).getBalanceChanges({
      ...params,
      subgraphApiKey: 'network-key',
    });

    expect(headersOf(0).Authorization).toBe('Bearer network-key');
  });

  it('sends no Authorization header when no key is configured', async () => {
    // Self-hosted subgraphs need none, and sending an empty bearer would be
    // rejected by endpoints that are otherwise happy to answer.
    await makeService().getBalanceChanges(params);

    expect(headersOf(0).Authorization).toBeUndefined();
  });

  it('still sends the Origin header the subgraph allowlist expects', async () => {
    await makeService({
      SUBGRAPH_DOMAIN: 'https://example.org',
    }).getBalanceChanges(params);

    expect(headersOf(0).Origin).toBe('https://example.org');
  });
});

describe('GraphqlClientAdapterService error surfacing', () => {
  it('reports the gateway auth error instead of a destructuring crash', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: {
        errors: [{ message: 'auth error: missing authorization header' }],
      },
    } as never);

    await expect(makeService().getBalanceChanges(params)).rejects.toThrow(
      /auth error: missing authorization header/,
    );
  });

  it('says the key is missing when one was never configured', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: { errors: [{ message: 'auth error' }] },
    } as never);

    await expect(makeService().getBalanceChanges(params)).rejects.toThrow(
      /no SUBGRAPH_API_KEY configured/,
    );
  });

  it('does not blame a missing key when one was supplied', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: { errors: [{ message: 'indexers not available' }] },
    } as never);

    await expect(
      makeService().getBalanceChanges({ ...params, subgraphApiKey: 'k' }),
    ).rejects.toThrow(/indexers not available/);
    await expect(
      makeService().getBalanceChanges({ ...params, subgraphApiKey: 'k' }),
    ).rejects.not.toThrow(/no SUBGRAPH_API_KEY/);
  });

  it('throws a clear error when the body carries neither data nor errors', async () => {
    mockedPost.mockResolvedValue({ status: 200, data: {} } as never);

    await expect(makeService().getBalanceChanges(params)).rejects.toThrow(
      /returned no data/,
    );
  });

  it('returns the balance changes and block on a healthy response', async () => {
    const result = await makeService().getBalanceChanges({
      ...params,
      subgraphApiKey: 'k',
    });

    expect(result.balanceChanges).toHaveLength(1);
    expect(result.block).toEqual({ number: 42, timestamp: 1700 });
  });
});
