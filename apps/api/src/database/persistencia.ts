import { CandidatoInput, ListaCandidatos } from '@cadastro/contratos';

export const PERSISTENCIA = Symbol('PERSISTENCIA');

export interface CandidatoRegistro extends Omit<CandidatoInput, 'telefone' | 'areaInteresse' | 'resumoProfissional'> {
  id: string;
  telefone: string | null;
  areaInteresse: string | null;
  resumoProfissional: string | null;
  temCurriculo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface RecrutadorRegistro {
  id: string;
  email: string;
  senhaHash: string;
}

export interface Persistencia {
  criarCandidato(input: CandidatoInput, curriculoPdf?: Buffer): Promise<CandidatoRegistro>;
  anexarCurriculoPdf(id: string, curriculoPdf: Buffer): Promise<boolean>;
  buscarCurriculoPdf(id: string): Promise<Buffer | null>;
  listarCandidatos(pagina: number, limite: number): Promise<ListaCandidatos>;
  buscarCandidatoPorId(id: string): Promise<CandidatoRegistro | null>;
  existeCandidatoComEmail(email: string): Promise<boolean>;
  buscarRecrutadorPorEmail(email: string): Promise<RecrutadorRegistro | null>;
  criarRecrutador(email: string, senhaHash: string): Promise<RecrutadorRegistro>;
}

export function storageMode(): 'memory' | 'sqlserver' {
  const mode = (process.env.STORAGE_MODE ?? 'sqlserver').toLowerCase();
  if (mode !== 'memory' && mode !== 'sqlserver') throw new Error('STORAGE_MODE deve ser memory ou sqlserver.');
  return mode;
}
