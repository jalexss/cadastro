import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CandidatosService } from './candidatos.service';

describe('CandidatosService', () => {
  it('normaliza o e-mail e persiste os campos opcionais vazios como nulos', async () => {
    const persistencia = {
      criarCandidato: vi.fn(async (value) => ({ ...value, email: value.email.toLowerCase(), telefone: null, areaInteresse: null, resumoProfissional: null, id: '1', criadoEm: new Date(), atualizadoEm: new Date() }))
    };
    const service = new CandidatosService(persistencia as never);
    const result = await service.criar({ nomeCompleto: 'Ana Silva', email: 'ANA@example.com', telefone: '', areaInteresse: '', resumoProfissional: '' });
    expect(result.email).toBe('ana@example.com');
    expect(result.telefone).toBeNull();
    expect(persistencia.criarCandidato).toHaveBeenCalledOnce();
  });

  it('retorna resumo paginado sem buscar relações por item', async () => {
    const listarCandidatos = vi.fn(async () => ({ itens: [], pagina: 2, limite: 10, total: 1 }));
    const service = new CandidatosService({ listarCandidatos } as never);
    const result = await service.listar(1, 20);
    expect(result.total).toBe(1);
    expect(listarCandidatos).toHaveBeenCalledWith(1, 20);
  });

  it('busca os detalhes pelo identificador solicitado', async () => {
    const candidato = { id: 'candidato-1', nomeCompleto: 'Ana Silva', email: 'ana@example.com' };
    const buscarCandidatoPorId = vi.fn(async () => candidato);
    const service = new CandidatosService({ buscarCandidatoPorId } as never);

    await expect(service.buscarPorId('candidato-1')).resolves.toBe(candidato);
    expect(buscarCandidatoPorId).toHaveBeenCalledWith('candidato-1');
  });

  it('converte candidato ausente em NotFound', async () => {
    const service = new CandidatosService({ buscarCandidatoPorId: vi.fn(async () => null) } as never);
    await expect(service.buscarPorId('inexistente')).rejects.toBeInstanceOf(NotFoundException);
  });
});
