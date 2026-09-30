import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CandidatoInput, ListaCandidatos } from '@cadastro/contratos';
import { CandidatoRegistro, Persistencia, PERSISTENCIA } from '../database/persistencia';

@Injectable()
export class CandidatosService {
  constructor(@Inject(PERSISTENCIA) private readonly persistencia: Persistencia) {}

  criar(input: CandidatoInput): Promise<CandidatoRegistro> {
    return this.persistencia.criarCandidato(input);
  }

  listar(pagina: number, limite: number): Promise<ListaCandidatos> {
    return this.persistencia.listarCandidatos(pagina, limite);
  }

  async buscarPorId(id: string): Promise<CandidatoRegistro> {
    const candidato = await this.persistencia.buscarCandidatoPorId(id);
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');
    return candidato;
  }
}
