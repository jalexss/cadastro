import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CandidatoInput, ListaCandidatos } from '@cadastro/contratos';
import { CandidatoRegistro, Persistencia, RecrutadorRegistro } from './persistencia';

@Injectable()
export class PersistenciaMemoriaService implements Persistencia {
  private readonly candidatos = new Map<string, CandidatoRegistro>();
  private readonly curriculos = new Map<string, Buffer>();
  private readonly recrutadores = new Map<string, RecrutadorRegistro>();

  async criarCandidato(input: CandidatoInput, curriculoPdf?: Buffer): Promise<CandidatoRegistro> {
    const agora = new Date();
    const candidato: CandidatoRegistro = {
      id: randomUUID(),
      nomeCompleto: input.nomeCompleto,
      email: input.email.trim().toLowerCase(),
      telefone: input.telefone || null,
      areaInteresse: input.areaInteresse || null,
      resumoProfissional: input.resumoProfissional || null,
      temCurriculo: Boolean(curriculoPdf),
      criadoEm: agora,
      atualizadoEm: agora
    };
    this.candidatos.set(candidato.id, candidato);
    if (curriculoPdf) this.curriculos.set(candidato.id, Buffer.from(curriculoPdf));
    return { ...candidato };
  }

  async listarCandidatos(pagina: number, limite: number): Promise<ListaCandidatos> {
    const ordenados = [...this.candidatos.values()].sort((a, b) =>
      b.criadoEm.getTime() - a.criadoEm.getTime() || b.id.localeCompare(a.id));
    const inicio = (pagina - 1) * limite;
    return {
      itens: ordenados.slice(inicio, inicio + limite).map(({ id, nomeCompleto, email, areaInteresse, criadoEm, temCurriculo }) => ({
        id, nomeCompleto, email, areaInteresse: areaInteresse ?? '', criadoEm: criadoEm.toISOString(), temCurriculo
      })),
      pagina,
      limite,
      total: ordenados.length
    };
  }

  async buscarCandidatoPorId(id: string): Promise<CandidatoRegistro | null> {
    const candidato = this.candidatos.get(id.toLowerCase());
    return candidato ? { ...candidato } : null;
  }

  async buscarCurriculoPdf(id: string): Promise<Buffer | null> {
    const arquivo = this.curriculos.get(id.toLowerCase());
    return arquivo ? Buffer.from(arquivo) : null;
  }

  async anexarCurriculoPdf(id: string, curriculoPdf: Buffer): Promise<boolean> {
    const chave = id.toLowerCase();
    const candidato = this.candidatos.get(chave);
    if (!candidato || candidato.temCurriculo) return false;
    this.curriculos.set(chave, Buffer.from(curriculoPdf));
    this.candidatos.set(chave, { ...candidato, temCurriculo: true, atualizadoEm: new Date() });
    return true;
  }

  async existeCandidatoComEmail(email: string): Promise<boolean> {
    return [...this.candidatos.values()].some((candidato) => candidato.email === email.toLowerCase());
  }

  async buscarRecrutadorPorEmail(email: string): Promise<RecrutadorRegistro | null> {
    const recrutador = this.recrutadores.get(email.toLowerCase());
    return recrutador ? { ...recrutador } : null;
  }

  async criarRecrutador(email: string, senhaHash: string): Promise<RecrutadorRegistro> {
    const recrutador = { id: randomUUID(), email: email.toLowerCase(), senhaHash };
    this.recrutadores.set(recrutador.email, recrutador);
    return { ...recrutador };
  }
}
