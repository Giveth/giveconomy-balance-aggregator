import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from 'src/modules/database.module';
import TestConfigureModule from 'test/modules/testConfigure.module';

describe('DatabaseModule', () => {
  let testModule: TestingModule;
  let databaseModule: DatabaseModule;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [TestConfigureModule, DatabaseModule],
    }).compile();

    databaseModule = testModule.get<DatabaseModule>(DatabaseModule);
  });

  it('databaseModule should be defined', () => {
    expect(databaseModule).toBeDefined();
  });
});
