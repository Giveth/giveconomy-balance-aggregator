import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from 'src/modules/balance/balance';
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
          entities: [Balance],
          synchronize: process.env.NODE_ENV !== 'production',
        };
        return options;
      },
      dataSourceFactory: async (options: ConnectionOptions) => {
        const dataSource = await new DataSource(options).initialize();
        if (options.synchronize) {
          await dataSource.synchronize();
        }
        if (process.env.NODE_ENV === 'test') {
          const entities = dataSource.entityMetadatas;
          for (const entity of entities) {
            const repository = dataSource.getRepository(entity.name);
            await repository.query(`DELETE FROM ${entity.tableName}`);
          }
        }
        return dataSource;
      },
    }),
  ],
})
export class DatabaseModule {}
