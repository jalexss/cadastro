import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { camposExtraidosSchema, CamposExtraidos } from '@cadastro/contratos';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { OcrCurriculoClient } from './ocr-curriculo.client';

const MAX_PAGES = 50;
const MAX_TEXT_LENGTH = 100_000;
const MIN_TEXT_FOR_OCR = 60;
const HEADING = /^(curr[ií]culo|curriculum vitae|resume|contato|dados pessoais|perfil|objetivo|experi[eê]ncia|forma[cç][aã]o|educa[cç][aã]o|habilidades|compet[eê]ncias|sobre mim)$/i;
const ROTULO_TELEFONE = /(?:telefone|tel(?:efone)?|phone|celular|mobile|whatsapp)/i;
const DDD_BRASILEIRO = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 93, 94, 95, 96, 97, 98, 99]);

function pareceTelefone(texto: string, inicio: number, original: string): boolean {
  const digitos = original.replace(/\D/g, '');
  if (digitos.length < 8 || digitos.length > 15) return false;

  const anterior = texto.slice(Math.max(0, inicio - 40), inicio);
  const posterior = texto.slice(inicio + original.length, inicio + original.length + 32);
  const rotuloAntes = ROTULO_TELEFONE.test(anterior) && !/\p{L}/u.test(anterior.slice(anterior.lastIndexOf('\n') + 1).replace(ROTULO_TELEFONE, ''));
  const rotuloDepois = /^\s*[:.)-]?\s*/.test(posterior) && ROTULO_TELEFONE.test(posterior.slice(0, 20));
  const internacional = /^\s*(?:\+|00)/.test(original);
  if (rotuloAntes || rotuloDepois) return true;
  if (internacional) return digitos.length >= 10;

  const nacional = digitos.length >= 12 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
  if (nacional.length !== 10 && nacional.length !== 11) return false;
  if (!DDD_BRASILEIRO.has(Number(nacional.slice(0, 2)))) return false;
  const numero = nacional.slice(2);
  return numero.length === 9 ? numero.startsWith('9') : /^[2-5]/.test(numero);
}

function identificarTelefone(texto: string): string | undefined {
  const candidatos = /(?<![\p{L}\d])(?:\+\s*|00\s*)?\(?\d(?:[\d\s()./\-–—]*\d){7,14}(?!\d)/gu;
  for (const correspondencia of texto.matchAll(candidatos)) {
    const original = correspondencia[0].trim();
    if (pareceTelefone(texto, correspondencia.index ?? 0, original)) return original.replace(/\s+/g, ' ');
  }
  return undefined;
}

export function identificarCampos(texto: string): CamposExtraidos {
  const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  const telefone = identificarTelefone(texto);
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
