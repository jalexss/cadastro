import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { camposExtraidosSchema, CamposExtraidos } from '@cadastro/contratos';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { OcrCurriculoClient } from './ocr-curriculo.client';

const MAX_PAGES = 50;
const MAX_TEXT_LENGTH = 100_000;
const MIN_TEXT_FOR_OCR = 60;
const HEADING = /^(curr[ií]culo|curriculum vitae|resume|contato|dados pessoais|perfil|objetivo|experi[eê]ncia|forma[cç][aã]o|educa[cç][aã]o|habilidades|compet[eê]ncias|sobre mim)$/i;

export function identificarCampos(texto: string): CamposExtraidos {
  const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  const telefone = texto.match(/(?:\+?\d{1,3}[\s.-]*)?(?:\(?\d{2,3}\)?[\s.-]*)?\d{4,5}[\s.-]?\d{4}/)?.[0]?.trim();
  const nomeCompleto = texto.split(/[\r\n]+/).map((line) => line.trim().replace(/\s+/g, ' '))
    .find((line) => line.length >= 4 && line.length <= 100 && /\p{L}/u.test(line) && line.split(' ').length >= 2 && !line.includes('@') && !/\d/.test(line) && !HEADING.test(line));
  return camposExtraidosSchema.parse({
    ...(nomeCompleto ? { nomeCompleto } : {}),
    ...(email ? { email } : {}),
    ...(telefone ? { telefone } : {})
  });
}

@Injectable()
export class ExtracaoCurriculoService {
  constructor(private readonly ocr: OcrCurriculoClient, private readonly auditoria: AuditoriaService) {}

  async extrair(buffer: Buffer): Promise<CamposExtraidos> {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new UnprocessableEntityException('Não foi possível ler o currículo. Você pode preencher o cadastro manualmente.');
    }
    let tarefa: { promise: Promise<unknown>; destroy: () => Promise<void> } | undefined;
    const inicio = performance.now();
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false });
      const documento = await tarefa.promise as {
        numPages: number;
        getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }>;
      };
      if (documento.numPages > MAX_PAGES) throw new Error('Limite de páginas excedido.');
      const linhas: string[] = [];
      for (let pageNumber = 1; pageNumber <= documento.numPages; pageNumber += 1) {
        const page = await documento.getPage(pageNumber);
        const content = await page.getTextContent();
        linhas.push(...content.items.map((item) => item.str ?? '').filter(Boolean));
        if (linhas.join(' ').length > MAX_TEXT_LENGTH) throw new Error('Limite de texto excedido.');
      }
      let texto = linhas.join('\n');
      let caminho = 'pdfjs';
      if (texto.replace(/\s/g, '').length < MIN_TEXT_FOR_OCR) {
        caminho = 'ocr';
        texto = await this.ocr.extrairTexto(buffer);
      }
      const campos = identificarCampos(texto);
      this.auditoria.registrar('pdf.extracao', {
        caminho,
        resultado: Object.keys(campos).length ? 'campos_encontrados' : 'sem_campos',
        paginas: Math.min(documento.numPages, 15),
        duracaoMs: Math.round(performance.now() - inicio)
      });
      return campos;
    } catch {
      this.auditoria.registrar('pdf.extracao', { resultado: 'falha_recuperavel', duracaoMs: Math.round(performance.now() - inicio) });
      throw new UnprocessableEntityException('Não foi possível ler o currículo. Você pode preencher o cadastro manualmente.');
    } finally {
      await tarefa?.destroy().catch(() => undefined);
    }
  }
}
