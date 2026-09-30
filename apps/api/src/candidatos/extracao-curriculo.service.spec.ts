import { describe, expect, it, vi } from 'vitest';
import { ExtracaoCurriculoService, identificarCampos } from './extracao-curriculo.service';

const pdfjs = vi.hoisted(() => ({
  getDocument: vi.fn()
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => pdfjs);

describe('Extração de currículo', () => {
  it('falha de forma recuperável para conteúdo que não é PDF', async () => {
    const service = new ExtracaoCurriculoService({ extrairTexto: vi.fn() } as never, { registrar: vi.fn() } as never);
    await expect(service.extrair(Buffer.from('não é pdf'))).rejects.toThrow('preencher o cadastro manualmente');
  });

  it('identifica campos parciais sem inventar dados ausentes', () => {
    expect(identificarCampos('Ana Silva\nana@example.com')).toEqual({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' });
  });

  it('identifica o cargo logo abaixo do nome e o resumo até a próxima seção', () => {
    expect(identificarCampos([
      'Ana Silva',
      'Desenvolvedora Full Stack',
      'ana@example.com',
      'RESUMO PROFISSIONAL',
      'Profissional com experiência em desenvolvimento de aplicações web e integração de sistemas.',
      'Atua em equipes multidisciplinares e prioriza qualidade e colaboração.',
      'HABILIDADES TÉCNICAS',
      'React, Node.js e SQL Server'
    ].join('\n'))).toEqual({
      nomeCompleto: 'Ana Silva',
      email: 'ana@example.com',
      areaInteresse: 'Desenvolvedora Full Stack',
      resumoProfissional: 'Profissional com experiência em desenvolvimento de aplicações web e integração de sistemas. Atua em equipes multidisciplinares e prioriza qualidade e colaboração.'
    });
  });

  it('reconhece rótulo explícito de cargo sem inventar resumo ausente', () => {
    expect(identificarCampos('Ana Silva\nCargo de interesse: Analista de Dados\nTelefone: (11) 99999-9999')).toMatchObject({
      areaInteresse: 'Analista de Dados',
      telefone: '(11) 99999-9999'
    });
    expect(identificarCampos('Ana Silva\nCargo de interesse: Analista de Dados')).not.toHaveProperty('resumoProfissional');
  });

  it('ignora sequências de oito dígitos que parecem intervalos de anos', () => {
    expect(identificarCampos('Ana Silva\nFormação\n2023–2024')).toEqual({ nomeCompleto: 'Ana Silva' });
    expect(identificarCampos('Ana Silva\n20232024')).toEqual({ nomeCompleto: 'Ana Silva' });
  });

  it('reconhece telefone brasileiro com DDD e número local válido', () => {
    expect(identificarCampos('Ana Silva\nTelefone: (11) 99999-9999')).toMatchObject({ telefone: '(11) 99999-9999' });
    expect(identificarCampos('Ana Silva\n+55 11 99999-9999')).toMatchObject({ telefone: '+55 11 99999-9999' });
  });

  it('aceita número local curto somente quando há rótulo de telefone', () => {
    expect(identificarCampos('Ana Silva\nTelefone: 12345678')).toMatchObject({ telefone: '12345678' });
    expect(identificarCampos('Ana Silva\n12345678')).not.toHaveProperty('telefone');
  });

  it('usa OCR local como fallback para PDF sem camada de texto', async () => {
    const documento = { numPages: 1, getPage: vi.fn(async () => ({ getTextContent: vi.fn(async () => ({ items: [] })) })) };
    pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(documento), destroy: vi.fn(async () => undefined) });
    const ocr = { extrairTexto: vi.fn(async () => 'Ana Silva\nDesenvolvedora\nana@example.com\n(11) 99999-9999\nResumo profissional\nExperiência com sistemas, integração e desenvolvimento de aplicações para clientes.\nFormação\nTecnologia em Sistemas') };
    const service = new ExtracaoCurriculoService(ocr as never, { registrar: vi.fn() } as never);

    await expect(service.extrair(Buffer.from('%PDF-1.7 conteúdo escaneado'))).resolves.toEqual({
      nomeCompleto: 'Ana Silva', email: 'ana@example.com', telefone: '(11) 99999-9999',
      areaInteresse: 'Desenvolvedora',
      resumoProfissional: 'Experiência com sistemas, integração e desenvolvimento de aplicações para clientes.'
    });
    expect(ocr.extrairTexto).toHaveBeenCalledOnce();
    expect(documento.getPage).toHaveBeenCalledOnce();
  });

  it('não chama OCR quando PDF.js já encontrou texto utilizável', async () => {
    const documento = { numPages: 1, getPage: vi.fn(async () => ({ getTextContent: vi.fn(async () => ({ items: [{ str: 'Ana Silva' }, { str: 'Telefone (11) 99999-9999' }, { str: 'Email ana@example.com' }, { str: 'perfil profissional e experiência em desenvolvimento' }] })) })) };
    pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(documento), destroy: vi.fn(async () => undefined) });
    const ocr = { extrairTexto: vi.fn() };
    const service = new ExtracaoCurriculoService(ocr as never, { registrar: vi.fn() } as never);

    await expect(service.extrair(Buffer.from('%PDF-1.7 texto'))).resolves.toMatchObject({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' });
    expect(ocr.extrairTexto).not.toHaveBeenCalled();
  });
});
