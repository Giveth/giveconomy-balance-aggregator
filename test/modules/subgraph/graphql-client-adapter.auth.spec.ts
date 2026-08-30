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

/**
 * A shared key is a convenience default, not a licence to authenticate to every
 * host in the config. Real deployments mix hosts: staging pairs Studio-hosted
 * subgraphs (api.studio.thegraph.com) with gateway-hosted ones, and only the
 * gateway ever needed the credential.
 */
describe('GraphqlClientAdapterService shared-key host scoping', () => {
  const studioUrl =
    'https://api.studio.thegraph.com/query/76292/giveconomy-staging/version/latest';

  it('does not send the shared key to a host outside the allowlist', async () => {
    await makeService({ SUBGRAPH_API_KEY: 'global-key' }).getBalanceChanges({
      ...params,
      subgraphUrl: studioUrl,
    });

    expect(headersOf(0).Authorization).toBeUndefined();
    expect(headersOf(0).Origin).toBeDefined();
  });

  it('still sends the shared key to the default gateway hosts', async () => {
    const service = makeService({ SUBGRAPH_API_KEY: 'global-key' });

    await service.getBalanceChanges(params);
    await service.getBalanceChanges({
      ...params,
      subgraphUrl:
        'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/abc',
    });

    expect(headersOf(0).Authorization).toBe('Bearer global-key');
    expect(headersOf(1).Authorization).toBe('Bearer global-key');
  });

  it('honours an explicit per-network key even off the allowlist', async () => {
    // The operator naming a key for this network is a deliberate choice; the
    // host allowlist only governs the shared fallback.
    await makeService({ SUBGRAPH_API_KEY: 'global-key' }).getBalanceChanges({
      ...params,
      subgraphUrl: studioUrl,
      subgraphApiKey: 'network-key',
    });

    expect(headersOf(0).Authorization).toBe('Bearer network-key');
  });

  it('lets SUBGRAPH_API_KEY_HOSTS override the defaults', async () => {
    await makeService({
      SUBGRAPH_API_KEY: 'global-key',
      SUBGRAPH_API_KEY_HOSTS: ' api.studio.thegraph.com , example.com ',
    }).getBalanceChanges({ ...params, subgraphUrl: studioUrl });

    expect(headersOf(0).Authorization).toBe('Bearer global-key');
  });

  it('withholds the shared key from a gateway host once overridden away', async () => {
    await makeService({
      SUBGRAPH_API_KEY: 'global-key',
      SUBGRAPH_API_KEY_HOSTS: 'api.studio.thegraph.com',
    }).getBalanceChanges(params);

    expect(headersOf(0).Authorization).toBeUndefined();
  });
});

describe('GraphqlClientAdapterService credential hygiene', () => {
  it('refuses to send a key over plain HTTP', async () => {
    await expect(
      makeService().getBalanceChanges({
        ...params,
        subgraphUrl: 'http://gateway.thegraph.com/api/subgraphs/id/abc',
        subgraphApiKey: 'network-key',
      }),
    ).rejects.toThrow(/non-HTTPS/);

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('still allows an unauthenticated HTTP subgraph', async () => {
    // Self-hosted subgraphs on a private network carry no credential, so there
    // is nothing to leak and no reason to break them.
    await makeService().getBalanceChanges({
      ...params,
      subgraphUrl: 'http://localhost:8000/subgraphs/name/giveth/test',
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(headersOf(0).Authorization).toBeUndefined();
  });

  it('does not claim a key is missing when one is embedded in the URL', async () => {
    // Seen for real on staging: network 2442 failed with "subgraph not found:
    // no allocations" and the message went on to blame a missing key, while the
    // URL carried one all along. That points the reader at the wrong fix.
    mockedPost.mockResolvedValue({
      status: 200,
      data: { errors: [{ message: 'subgraph not found: no allocations' }] },
    } as never);

    const message = await makeService()
      .getBalanceChanges({
        ...params,
        subgraphUrl:
          'https://gateway-arbitrum.network.thegraph.com/api/720ca27934ee17d259dc2975d9a6d714/subgraphs/id/abc',
      })
      .then(
        () => 'did not throw',
        (error: Error) => error.message,
      );

    expect(message).toContain('no allocations');
    expect(message).not.toContain('no SUBGRAPH_API_KEY configured');
  });

  it('still says the key is missing for a keyless gateway URL', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: {
        errors: [{ message: 'auth error: missing authorization header' }],
      },
    } as never);

    const message = await makeService()
      .getBalanceChanges(params)
      .then(
        () => 'did not throw',
        (error: Error) => error.message,
      );

    expect(message).toContain('no SUBGRAPH_API_KEY configured');
  });

  it('keeps a URL-embedded key out of error messages', async () => {
    // The gateway also accepts the key inside the path, which is the form the
    // deployed configs use. An error naming the raw URL would publish it.
    mockedPost.mockResolvedValue({
      status: 200,
      data: { errors: [{ message: 'auth error: invalid key' }] },
    } as never);

    const secretUrl =
      'https://gateway-arbitrum.network.thegraph.com/api/720ca27934ee17d259dc2975d9a6d714/subgraphs/id/abc';

    const message = await makeService()
      .getBalanceChanges({ ...params, subgraphUrl: secretUrl })
      .then(
        () => 'did not throw',
        (error: Error) => error.message,
      );

    expect(message).toContain('<redacted>');
    expect(message).not.toContain('720ca27934ee17d259dc2975d9a6d714');
  });
});
