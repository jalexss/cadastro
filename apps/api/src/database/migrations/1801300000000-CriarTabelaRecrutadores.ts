import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarTabelaRecrutadores1801300000000 implements MigrationInterface {
  name = 'CriarTabelaRecrutadores1801300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE [recrutadores] (
      [id] uniqueidentifier NOT NULL,
      [email] nvarchar(254) NOT NULL,
      [senha_hash] nvarchar(255) NOT NULL,
      [criado_em] datetime2 NOT NULL CONSTRAINT [DF_recrutadores_criado_em] DEFAULT SYSUTCDATETIME(),
      CONSTRAINT [PK_recrutadores] PRIMARY KEY ([id]),
      CONSTRAINT [UQ_recrutadores_email] UNIQUE ([email])
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE [recrutadores]');
  }
}
