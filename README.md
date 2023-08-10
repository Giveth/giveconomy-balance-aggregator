
## Balance Aggregator

This service retrieves balances and their history from various sources and provides a persistent representation of the balances.
It is specifically designed to serve as a backend for the Giveth impact-graph service, catering to the requirements of GIVpower-related functionalities.

The Balance Aggregator can furnish the aggregated balance of an address at a given block number or a specific date (GIVpower balance snapshot).
Additionally, it can provide balances that have been updated after a particular date (GIVpower Instant Boosting).

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# start test database
$ docker-compose -f docker/docker-compose-test-postgres.yml up -d

# unit tests
$ npm run test
```

## API
See [swagger](http://localhost:3000/api)
