import { describe, expect, it } from 'vitest';
import { PersistenciaMemoriaService } from './persistencia-memoria.service';

describe('Persistencia em memória', () => {
  it('implementa criação, paginação, detalhe e normalização de e-mail', async () => {
    const store = new PersistenciaMemoriaService();
    const saved = await store.criarCandidato({ nomeCompleto: 'Ana Silva', email: 'ANA@EXAMPLE.TEST' });
    const list = await store.listarCandidatos(1, 10);

    expect(saved.email).toBe('ana@example.test');
    expect(list).toMatchObject({ total: 1, itens: [{ id: saved.id, nomeCompleto: 'Ana Silva' }] });
    expect(await store.buscarCandidatoPorId(saved.id)).toMatchObject({ email: 'ana@example.test' });
    expect(await store.buscarCandidatoPorId('nao-existe')).toBeNull();
  });

  it('armazena apenas o hash recebido para as contas de recrutamento', async () => {
    const store = new PersistenciaMemoriaService();
    await store.criarRecrutador('EQUIPE@example.test', 'argon2id-hash');
    expect(await store.buscarRecrutadorPorEmail('equipe@example.test')).toMatchObject({ senhaHash: 'argon2id-hash' });
  });
});
