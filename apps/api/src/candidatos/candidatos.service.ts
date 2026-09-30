import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CandidatoInput, ListaCandidatos } from '@cadastro/contratos';
import { CandidatoRegistro, Persistencia, PERSISTENCIA } from '../database/persistencia';

@Injectable()
export class CandidatosService {
  constructor(@Inject(PERSISTENCIA) private readonly persistencia: Persistencia) {}

  criar(input: CandidatoInput, curriculoPdf?: Buffer): Promise<CandidatoRegistro> {
    return this.persistencia.criarCandidato(input, curriculoPdf);
  }

  listar(pagina: number, limite: number): Promise<ListaCandidatos> {
    return this.persistencia.listarCandidatos(pagina, limite);
  }

  async buscarPorId(id: string): Promise<CandidatoRegistro> {
    const candidato = await this.persistencia.buscarCandidatoPorId(id);
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');
    return candidato;
  }

  async buscarCurriculoPdf(id: string): Promise<Buffer> {
    const arquivo = await this.persistencia.buscarCurriculoPdf(id);
    if (!arquivo) throw new NotFoundException('Currículo não encontrado.');
    return arquivo;
  }

  async anexarCurriculoPdf(id: string, arquivo: Buffer): Promise<void> {
    const candidato = await this.persistencia.buscarCandidatoPorId(id);
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');
    if (candidato.temCurriculo || !(await this.persistencia.anexarCurriculoPdf(id, arquivo))) {
      throw new ConflictException('Este candidato já possui um currículo PDF associado.');
    }
  }
}
