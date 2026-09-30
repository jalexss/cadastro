import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarTabelaCandidatos1710000000000 implements MigrationInterface {
  name = 'CriarTabelaCandidatos1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE [candidatos] (
      [id] uniqueidentifier NOT NULL,
      [nome_completo] nvarchar(160) NOT NULL,
      [email] nvarchar(254) NOT NULL,
      [telefone] nvarchar(40) NULL,
      [area_interesse] nvarchar(140) NULL,
      [resumo_profissional] nvarchar(3000) NULL,
      [criado_em] datetime2 NOT NULL CONSTRAINT [DF_candidatos_criado_em] DEFAULT SYSUTCDATETIME(),
      [atualizado_em] datetime2 NOT NULL CONSTRAINT [DF_candidatos_atualizado_em] DEFAULT SYSUTCDATETIME(),
      CONSTRAINT [PK_candidatos] PRIMARY KEY ([id])
    )`);
    await queryRunner.query('CREATE INDEX [IX_candidatos_criado_em] ON [candidatos] ([criado_em] DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX [IX_candidatos_criado_em] ON [candidatos]');
    await queryRunner.query('DROP TABLE [candidatos]');
  }
}
