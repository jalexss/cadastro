import { describe, expect, it } from 'vitest';
import { candidatoSchema, camposExtraidosSchema, loginSchema } from './index';

const candidatoValido = { nomeCompleto: 'Ana Silva', email: 'ana@example.com' };

describe('contratos de candidato', () => {
  it('exige nome completo e e-mail válido', () => {
    expect(candidatoSchema.safeParse({ ...candidatoValido, nomeCompleto: '' }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, email: 'invalido' }).success).toBe(false);
    expect(candidatoSchema.safeParse(candidatoValido).success).toBe(true);
  });

  it('aceita acentos, hífen e apóstrofo em nomes e normaliza espaços externos', () => {
    const resultado = candidatoSchema.safeParse({ nomeCompleto: "  Joana D'Ávila-Santos  ", email: '  Joana+rh@Example.com  ', areaInteresse: 'C++ / C#', resumoProfissional: 'Experiência com Node.js, APIs e integração.' });
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data).toMatchObject({ nomeCompleto: "Joana D'Ávila-Santos", email: 'Joana+rh@Example.com', areaInteresse: 'C++ / C#' });
  });

  it.each(['', 'ana', 'ana@', 'ana@example', 'ana..silva@example.com', 'ana@.com', 'ana@@example.com', 'ana @example.com', 'ana@example..com', 'ana@localhost', 'ana@example.com<script>'])('rejeita formato de e-mail inválido: %s', (email) => {
    expect(candidatoSchema.safeParse({ ...candidatoValido, email }).success).toBe(false);
  });

  it('rejeita nome vazio com espaços, textos acima do limite e dados extras', () => {
    expect(candidatoSchema.safeParse({ ...candidatoValido, nomeCompleto: ' \t\n ' }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, nomeCompleto: 'A'.repeat(161) }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, email: `${'a'.repeat(243)}@example.com` }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, campoInesperado: 'não' }).success).toBe(false);
  });

  it('permite opcionais vazios e rejeita valores além dos limites de tamanho', () => {
    expect(candidatoSchema.safeParse({ ...candidatoValido, telefone: '', areaInteresse: '', resumoProfissional: '' }).success).toBe(true);
    expect(candidatoSchema.safeParse({ ...candidatoValido, telefone: '1'.repeat(41) }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, areaInteresse: 'a'.repeat(141) }).success).toBe(false);
    expect(candidatoSchema.safeParse({ ...candidatoValido, resumoProfissional: 'a'.repeat(3001) }).success).toBe(false);
  });

  it('aceita extração parcial, inclusive quando o PDF não revela todos os dados', () => {
    expect(camposExtraidosSchema.parse({ email: 'ana@example.com' })).toEqual({ email: 'ana@example.com' });
    expect(camposExtraidosSchema.parse({ areaInteresse: 'Desenvolvedora', resumoProfissional: 'Experiência profissional...' })).toMatchObject({ areaInteresse: 'Desenvolvedora' });
    expect(camposExtraidosSchema.safeParse({ email: 'malformado' }).success).toBe(false);
    expect(camposExtraidosSchema.safeParse({ nomeCompleto: 'Ana Silva', dadosPessoais: 'não esperado' }).success).toBe(false);
  });

  it('valida o e-mail e os limites de senha no contrato de login', () => {
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: 'senha forte' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: '  equipe@example.com  ', senha: 'senha forte' }).success).toBe(true);
    for (const email of ['sem-arroba', 'equipe@', 'equipe@example', 'equipe@@example.com']) {
      expect(loginSchema.safeParse({ email, senha: 'senha forte' }).success).toBe(false);
    }
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: '   \t  ' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: ' senha forte ' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: 'x'.repeat(129) }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'equipe@example.com', senha: 'senha forte', admin: true }).success).toBe(false);
  });
});
