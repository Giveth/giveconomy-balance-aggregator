/**
 * Helpers for handling subgraph credentials safely.
 *
 * A key can reach this service two ways: as a config field (`subgraphApiKey`)
 * or embedded in the URL itself (`/api/<key>/subgraphs/...`), which is the form
 * The Graph's gateway has always accepted and which the deployed configs use.
 * Both land in logs unless they are redacted, so redaction has to cover the URL
 * as well as the field.
 */

/**
 * Hosts the shared `SUBGRAPH_API_KEY` may be sent to when a network does not
 * configure its own. Deployments mix gateway-hosted subgraphs with self-hosted
 * and Studio-hosted ones, and only the gateway needs (or should see) the key.
 */
export const DEFAULT_API_KEY_HOSTS = [
  'gateway.thegraph.com',
  'gateway-arbitrum.network.thegraph.com',
];

export const parseApiKeyHosts = (raw?: string): string[] =>
  (raw ?? '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);

/** True when `url`'s host is one the shared key is allowed to authenticate to. */
export const hostAcceptsSharedKey = (url: string, hosts: string[]): boolean => {
  try {
    return hosts.includes(new URL(url).host.toLowerCase());
  } catch {
    // An unparseable URL is not a host we can vouch for.
    return false;
  }
};

/** True only for a URL we can parse and that uses TLS. */
export const isHttps = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Replace a key embedded in a gateway URL path. Keyless gateway URLs
 * (`/api/subgraphs/id/...`) have no segment between `/api/` and `/subgraphs/`
 * and are left alone.
 */
export const redactUrl = (url: string): string =>
  url.replace(/\/api\/[^/]+\/subgraphs\//i, '/api/<redacted>/subgraphs/');

/** A copy of a fetch config that is safe to log. */
export const redactFetchConfig = <
  T extends { subgraphUrl?: string; subgraphApiKey?: string },
>(
  config: T,
): Record<string, unknown> => {
  const { subgraphApiKey, ...rest } = config;
  return {
    ...rest,
    ...(config.subgraphUrl
      ? { subgraphUrl: redactUrl(config.subgraphUrl) }
      : {}),
    ...(subgraphApiKey ? { subgraphApiKey: '<redacted>' } : {}),
  };
};
