import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTokenBalanceInsertTrigger1684090897120 } from 'src/migrations/1684090897120-CreateTokenBalanceInsertTrigger';
import { DataFetchState } from 'src/modules/fetch-state/data-fetch-state.entity';
import { TokenBalanceUpdate } from 'src/modules/token-balance/token-balance-update.entity';
import { TokenBalance } from 'src/modules/token-balance/token-balance.entity';
import { ConnectionOptions, DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const options: ConnectionOptions = {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          entities: [TokenBalance, TokenBalanceUpdate, DataFetchState],
          synchronize: process.env.NODE_ENV !== 'production',
          migrations: [CreateTokenBalanceInsertTrigger1684090897120],
          ssl:
            configService.get<string>('DATABASE_SSL') !== 'false'
              ? configService.get<string>('CA_CERT')
                ? {
                    rejectUnauthorized: true,
                    ca: configService.get<string>('CA_CERT'),
                  }
                : {
                    rejectUnauthorized: false,
                  }
              : false,
        };
        return options;
      },
      dataSourceFactory: async (options: ConnectionOptions) => {
        const dataSource = await new DataSource(options).initialize();
        if (options.synchronize) {
          await dataSource.synchronize();
        }
        await dataSource.runMigrations({});
        return dataSource;
      },
    }),
  ],
})
export class DatabaseModule {}
