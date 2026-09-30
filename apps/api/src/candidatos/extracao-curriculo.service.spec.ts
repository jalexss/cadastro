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

  it('usa OCR local como fallback para PDF sem camada de texto', async () => {
    const documento = { numPages: 1, getPage: vi.fn(async () => ({ getTextContent: vi.fn(async () => ({ items: [] })) })) };
    pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(documento), destroy: vi.fn(async () => undefined) });
    const ocr = { extrairTexto: vi.fn(async () => 'Ana Silva\nana@example.com\n(11) 99999-9999') };
    const service = new ExtracaoCurriculoService(ocr as never, { registrar: vi.fn() } as never);

    await expect(service.extrair(Buffer.from('%PDF-1.7 conteúdo escaneado'))).resolves.toEqual({
      nomeCompleto: 'Ana Silva', email: 'ana@example.com', telefone: '(11) 99999-9999'
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
