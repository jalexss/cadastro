import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'recrutadores' })
export class RecrutadorEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id!: string;

  @Column({ type: 'nvarchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'senha_hash', type: 'nvarchar', length: 255 })
  senhaHash!: string;

  @CreateDateColumn({ name: 'criado_em', type: 'datetime2', default: () => 'SYSUTCDATETIME()' })
  criadoEm!: Date;
}
