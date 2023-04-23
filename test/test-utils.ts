import { DataSource } from 'typeorm';
import { DataSourceOptions } from 'typeorm/data-source/DataSourceOptions';

export const getConnectionOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: 'localhost',
  port: 5632,
  username: 'postgres',
  password: 'postgres',
  database: 'balance-aggregator',
  entities: [__dirname + '/../src/modules/**/*.entity{.ts,.js}'],
});
let connection: DataSource;
export const globalSetup = async () => {
  // connect to the database and run migrations by typeorm
  const AppDataSource = new DataSource(getConnectionOptions());
  await AppDataSource.initialize();
  await AppDataSource.synchronize(true);
  await AppDataSource.runMigrations();
  connection = AppDataSource;
};

export const globalTeardown = async () => {
  // Close the TypeORM connection
  await connection.destroy();
};

export default globalSetup;
