import {
  hostAcceptsSharedKey,
  isHttps,
  parseApiKeyHosts,
  redactFetchConfig,
  redactUrl,
} from 'src/modules/subgraph/subgraph-credentials';

/**
 * A subgraph key reaches this service two ways: as the `subgraphApiKey` config
 * field, or embedded in the URL as `/api/<key>/subgraphs/...`. Both were being
 * written to the logs verbatim -- the config once per agent at startup, the URL
 * on every single fetch. Redaction has to cover both shapes.
 */

describe('redactUrl', () => {
  it('removes a key embedded in a gateway URL path', () => {
    expect(
      redactUrl(
        'https://gateway-arbitrum.network.thegraph.com/api/720ca27934ee17d259dc2975d9a6d714/subgraphs/id/abc',
      ),
    ).toBe(
      'https://gateway-arbitrum.network.thegraph.com/api/<redacted>/subgraphs/id/abc',
    );
  });

  it('leaves a keyless gateway URL untouched', () => {
    const url = 'https://gateway.thegraph.com/api/subgraphs/id/abc';
    expect(redactUrl(url)).toBe(url);
  });

  it('leaves a self-hosted URL untouched', () => {
    const url = 'https://api.studio.thegraph.com/query/76292/x/version/latest';
    expect(redactUrl(url)).toBe(url);
  });
});

describe('redactFetchConfig', () => {
  it('masks the key field and the key inside the URL, keeping everything else', () => {
    const redacted = redactFetchConfig({
      name: 'optimism-mainnet',
      network: 10,
      contractAddress: '0x301C739CF6bfb6B47A74878BdEB13f92F13Ae5E7',
      subgraphUrl:
        'https://gateway.thegraph.com/api/720ca27934ee17d259dc2975d9a6d714/subgraphs/id/abc',
      subgraphApiKey: 'super-secret',
      fetchInterval: 5000,
    });

    const serialised = JSON.stringify(redacted);
    expect(serialised).not.toContain('super-secret');
    expect(serialised).not.toContain('720ca27934ee17d259dc2975d9a6d714');

    // The log is still useful for debugging.
    expect(redacted.name).toBe('optimism-mainnet');
    expect(redacted.network).toBe(10);
    expect(redacted.fetchInterval).toBe(5000);
    expect(redacted.subgraphUrl).toContain('<redacted>');
  });

  it('does not invent a subgraphApiKey field when none was set', () => {
    const redacted = redactFetchConfig({
      name: 'gnosis',
      subgraphUrl: 'https://api.studio.thegraph.com/query/1/x/version/latest',
    });

    expect('subgraphApiKey' in redacted).toBe(false);
  });
});

describe('parseApiKeyHosts', () => {
  it('trims, lowercases and drops blanks', () => {
    expect(parseApiKeyHosts(' Gateway.TheGraph.com , ,example.com ')).toEqual([
      'gateway.thegraph.com',
      'example.com',
    ]);
  });

  it('returns an empty list for undefined or empty input', () => {
    expect(parseApiKeyHosts(undefined)).toEqual([]);
    expect(parseApiKeyHosts('  ')).toEqual([]);
  });
});

describe('hostAcceptsSharedKey', () => {
  const hosts = ['gateway.thegraph.com'];

  it('matches on host, ignoring path and case', () => {
    expect(
      hostAcceptsSharedKey(
        'https://GATEWAY.thegraph.com/api/subgraphs/id/abc',
        hosts,
      ),
    ).toBe(true);
  });

  it('rejects a different host', () => {
    expect(
      hostAcceptsSharedKey('https://api.studio.thegraph.com/query/1', hosts),
    ).toBe(false);
  });

  it('does not match a lookalike host that merely contains the name', () => {
    expect(
      hostAcceptsSharedKey('https://gateway.thegraph.com.evil.test/x', hosts),
    ).toBe(false);
  });

  it('rejects an unparseable URL rather than assuming it is safe', () => {
    expect(hostAcceptsSharedKey('not a url', hosts)).toBe(false);
  });
});

describe('isHttps', () => {
  it.each([
    ['https://gateway.thegraph.com/x', true],
    ['http://gateway.thegraph.com/x', false],
    ['ftp://example.com/x', false],
    ['not a url', false],
  ])('%s -> %s', (url, expected) => {
    expect(isHttps(url as string)).toBe(expected);
  });
});
