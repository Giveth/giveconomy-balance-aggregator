import { ConfigModule } from '@nestjs/config';

export default ConfigModule.forRoot({
  envFilePath: './config/test.env',
  isGlobal: true,
});
