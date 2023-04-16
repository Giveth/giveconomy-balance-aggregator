import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from 'src/storage/Entities/Balance';

export default TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'your-username',
  password: 'your-password',
  database: 'your-database-name',
  entities: [Balance],
  synchronize: process.env.NODE_ENV !== 'production',
});
