import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'candidatos' })
export class CandidatoEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id!: string;

  @Column({ name: 'nome_completo', type: 'nvarchar', length: 160 })
  nomeCompleto!: string;

  @Column({ type: 'nvarchar', length: 254 })
  email!: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  telefone!: string | null;

  @Column({ name: 'area_interesse', type: 'nvarchar', length: 140, nullable: true })
  areaInteresse!: string | null;

  @Column({ name: 'resumo_profissional', type: 'nvarchar', length: 3000, nullable: true })
  resumoProfissional!: string | null;

  @Column({ name: 'tem_curriculo', type: 'bit', default: false })
  temCurriculo!: boolean;

  @Column({ name: 'curriculo_pdf', type: 'varbinary', length: 'max', nullable: true, select: false })
  curriculoPdf!: Buffer | null;

  @CreateDateColumn({ name: 'criado_em', type: 'datetime2', default: () => 'SYSUTCDATETIME()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'datetime2', default: () => 'SYSUTCDATETIME()' })
  atualizadoEm!: Date;
}
