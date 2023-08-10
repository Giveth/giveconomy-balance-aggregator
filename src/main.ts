import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataFetchAgentService } from 'src/modules/data-fetcher/data-fetch-agent.service';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataFetchAgent = app.get<DataFetchAgentService>(DataFetchAgentService);
  await dataFetchAgent.startFetch();

  const config = new DocumentBuilder()
    .setTitle('Balance Aggregator')
    .setDescription('The Balance Aggregator API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
