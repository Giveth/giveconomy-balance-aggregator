import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DatabaseModule } from 'src/modules/database.module';
import TestConfigureModule from 'test/modules/testConfigure.module';

describe('DatabaseModule', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestConfigureModule, DatabaseModule],
    }).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });

  it('should have database configuration', () => {
    const databaseConfig = {
      type: 'postgres',
      host: configService.get<string>('DATABASE_HOST'),
      port: configService.get<number>('DATABASE_PORT'),
      username: configService.get<string>('DATABASE_USER'),
      password: configService.get<string>('DATABASE_PASSWORD'),
      database: configService.get<string>('DATABASE_NAME'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
    };

    expect(databaseConfig).toBeDefined();
    expect(databaseConfig.host).toEqual('localhost');
    expect(databaseConfig.port).toEqual('5632');
    expect(databaseConfig.username).toEqual('postgres');
    expect(databaseConfig.password).toEqual('postgres');
    expect(databaseConfig.database).toEqual('balance-aggregator');
  });
});
