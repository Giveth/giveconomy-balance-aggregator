import * as fs from 'fs';

import { NestFactory, PartialGraphHost } from '@nestjs/core';
import { DataFetchAgentService } from 'src/modules/data-fetcher/data-fetch-agent.service';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataFetchAgent = app.get<DataFetchAgentService>(DataFetchAgentService);
  await dataFetchAgent.startFetch();
  await app.listen(3000);
}
bootstrap().catch(err => {
  fs.writeFileSync('graph.json', PartialGraphHost.toString() ?? '');
  process.exit(1);
});
