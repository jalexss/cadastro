import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarCurriculoPdf1802000000000 implements MigrationInterface {
  name = 'AdicionarCurriculoPdf1802000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [candidatos]
      ADD [tem_curriculo] bit NOT NULL CONSTRAINT [DF_candidatos_tem_curriculo] DEFAULT 0,
          [curriculo_pdf] varbinary(max) NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [candidatos]
      DROP CONSTRAINT [DF_candidatos_tem_curriculo],
      DROP COLUMN [tem_curriculo],
      DROP COLUMN [curriculo_pdf]`);
  }
}
