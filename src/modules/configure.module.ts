import { ConfigModule } from '@nestjs/config';

const configureModule = ConfigModule.forRoot({
  envFilePath:
    './config/' + process.env.node_env === 'production'
      ? 'production.env'
      : 'development.env',
  isGlobal: true,
});

export default configureModule;
