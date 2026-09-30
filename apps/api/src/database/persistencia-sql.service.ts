import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { CandidatoInput, ListaCandidatos } from '@cadastro/contratos';
import { Repository } from 'typeorm';
import { CandidatoEntity } from './candidato.entity';
import { RecrutadorEntity } from './recrutador.entity';
import { CandidatoRegistro, Persistencia, RecrutadorRegistro } from './persistencia';

@Injectable()
export class PersistenciaSqlService implements Persistencia {
  constructor(
    @InjectRepository(CandidatoEntity) private readonly candidatos: Repository<CandidatoEntity>,
    @InjectRepository(RecrutadorEntity) private readonly recrutadores: Repository<RecrutadorEntity>
  ) {}

  async criarCandidato(input: CandidatoInput, curriculoPdf?: Buffer): Promise<CandidatoRegistro> {
    const result = await this.candidatos.save(this.candidatos.create({
      id: randomUUID(),
      nomeCompleto: input.nomeCompleto,
      email: input.email.trim().toLowerCase(),
      telefone: input.telefone || null,
      areaInteresse: input.areaInteresse || null,
      resumoProfissional: input.resumoProfissional || null,
      temCurriculo: Boolean(curriculoPdf),
      curriculoPdf: curriculoPdf ?? null
    }));
    return result as CandidatoRegistro;
  }

  async listarCandidatos(pagina: number, limite: number): Promise<ListaCandidatos> {
    const [itens, total] = await this.candidatos.createQueryBuilder('candidato')
      .select(['candidato.id', 'candidato.nomeCompleto', 'candidato.email', 'candidato.areaInteresse', 'candidato.criadoEm', 'candidato.temCurriculo'])
      .orderBy('candidato.criadoEm', 'DESC')
      .addOrderBy('candidato.id', 'DESC')
      .skip((pagina - 1) * limite)
      .take(limite)
      .getManyAndCount();
    return {
      itens: itens.map((item) => ({
        id: item.id.toLowerCase(), nomeCompleto: item.nomeCompleto, email: item.email,
        areaInteresse: item.areaInteresse ?? '', criadoEm: item.criadoEm.toISOString(), temCurriculo: item.temCurriculo
      })),
      pagina, limite, total
    };
  }

  async buscarCandidatoPorId(id: string): Promise<CandidatoRegistro | null> {
    const candidato = await this.candidatos.findOneBy({ id });
    return candidato ? candidato as CandidatoRegistro : null;
  }

  async buscarCurriculoPdf(id: string): Promise<Buffer | null> {
    const candidato = await this.candidatos.createQueryBuilder('candidato')
      .addSelect('candidato.curriculoPdf')
      .where('candidato.id = :id', { id })
      .andWhere('candidato.temCurriculo = :temCurriculo', { temCurriculo: true })
      .getOne();
    return candidato?.curriculoPdf ?? null;
  }

  async anexarCurriculoPdf(id: string, curriculoPdf: Buffer): Promise<boolean> {
    const candidato = await this.candidatos.findOneBy({ id });
    if (!candidato || candidato.temCurriculo) return false;
    const atualizacao = await this.candidatos.update({ id, temCurriculo: false }, {
      temCurriculo: true,
      curriculoPdf,
      atualizadoEm: new Date()
    });
    return (atualizacao.affected ?? 0) > 0;
  }

  async existeCandidatoComEmail(email: string): Promise<boolean> {
    return this.candidatos.existsBy({ email: email.toLowerCase() });
  }

  async buscarRecrutadorPorEmail(email: string): Promise<RecrutadorRegistro | null> {
    const recrutador = await this.recrutadores.findOneBy({ email: email.toLowerCase() });
    return recrutador ? { id: recrutador.id, email: recrutador.email, senhaHash: recrutador.senhaHash } : null;
  }

  async criarRecrutador(email: string, senhaHash: string): Promise<RecrutadorRegistro> {
    const recrutador = await this.recrutadores.save(this.recrutadores.create({ id: randomUUID(), email: email.toLowerCase(), senhaHash }));
    return { id: recrutador.id, email: recrutador.email, senhaHash: recrutador.senhaHash };
  }
}
