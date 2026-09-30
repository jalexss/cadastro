import { describe, expect, it } from 'vitest';
import { candidatoSchema, camposExtraidosSchema } from './index';

describe('contratos de candidato', () => {
  it('exige nome completo e e-mail válido', () => {
    expect(candidatoSchema.safeParse({ nomeCompleto: '', email: 'invalido' }).success).toBe(false);
    expect(candidatoSchema.safeParse({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' }).success).toBe(true);
  });

  it('permite campos opcionais vazios e rejeita campos extras', () => {
    expect(candidatoSchema.safeParse({ nomeCompleto: 'Ana', email: 'ana@example.com', telefone: '' }).success).toBe(true);
    expect(candidatoSchema.safeParse({ nomeCompleto: 'Ana', email: 'ana@example.com', segredo: 'não' }).success).toBe(false);
  });

  it('aceita extração parcial, inclusive quando o PDF não revela todos os dados', () => {
    expect(camposExtraidosSchema.parse({ email: 'ana@example.com' })).toEqual({ email: 'ana@example.com' });
  });
});
