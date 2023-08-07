import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenBalanceInsertTrigger1684090897120
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION TOKEN_BALANCE_BOUNDARY_SET_TRIGGER_FUNCTION() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
        BEGIN
          UPDATE token_balance SET
            "timeRange" = tsrange(lower("timeRange"), lower(NEW."timeRange"), '[)'),
            "blockRange" = int4range(lower("blockRange"), lower(NEW."blockRange"), '[)'),
            "update_at" = now()
          WHERE
            address = NEW.address and 
            network = NEW.network and 
            upper_inf("timeRange") and 
            lower("timeRange") <= lower(NEW."timeRange") and
            lower("blockRange") <= lower(NEW."blockRange");

          NEW.update_at = now();
          RETURN NEW;
           -- trigger logic
        END;
        $$ ;


        DROP TRIGGER IF EXISTS TOKEN_BALANCE_INSERT_TRIGGER ON TOKEN_BALANCE;


        CREATE TRIGGER TOKEN_BALANCE_INSERT_TRIGGER
        BEFORE INSERT ON TOKEN_BALANCE
        FOR EACH ROW EXECUTE PROCEDURE TOKEN_BALANCE_BOUNDARY_SET_TRIGGER_FUNCTION();
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS TOKEN_BALANCE_INSERT_TRIGGER ON TOKEN_BALANCE;
        DROP FUNCTION IF EXISTS TOKEN_BALANCE_BOUNDARY_SET_TRIGGER_FUNCTION();
      `);
  }
}
