import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
          entities: [TokenBalance],
          synchronize: process.env.NODE_ENV !== 'production',
        };
        return options;
      },
      dataSourceFactory: async (options: ConnectionOptions) => {
        const dataSource = await new DataSource(options).initialize();
        if (options.synchronize) {
          await dataSource.synchronize();
        }
        return dataSource;
      },
    }),
  ],
})
export class DatabaseModule {}
