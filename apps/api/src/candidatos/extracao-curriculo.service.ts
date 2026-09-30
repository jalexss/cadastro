import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { camposExtraidosSchema, CamposExtraidos } from '@cadastro/contratos';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { OcrCurriculoClient } from './ocr-curriculo.client';

const MAX_PAGES = 50;
const MAX_TEXT_LENGTH = 100_000;
const MIN_TEXT_FOR_OCR = 60;
const HEADING = /^(curr[ií]culo|curriculum vitae|resume|contato|dados pessoais|perfil(?: profissional)?|objetivo(?: profissional)?|resumo(?: profissional)?|summary|professional summary|professional profile|experi[eê]ncia(?: profissional)?|professional experience|forma[cç][aã]o|educa[cç][aã]o|education|habilidades(?: t[eé]cnicas)?|compet[eê]ncias|skills|sobre mim|projetos?(?: relevantes)?|certifica[cç][oõ]es|idiomas)$/i;
const SECTION_HEADING = /^(?:resumo(?: profissional)?|perfil(?: profissional)?|sobre mim|summary|professional summary|professional profile|objetivo(?: profissional)?|professional objective|experi[eê]ncia(?: profissional)?|professional experience|experi[eê]ncia|forma[cç][aã]o(?: acad[eê]mica)?|educa[cç][aã]o|education|habilidades(?: t[eé]cnicas)?|compet[eê]ncias|skills|projetos?(?: relevantes)?|certifica[cç][oõ]es|idiomas|cursos|informa[cç][oõ]es adicionais|additional information|refer[eê]ncias)$/i;
const ROTULO_TELEFONE = /(?:telefone|tel(?:efone)?|phone|celular|mobile|whatsapp)/i;
const ROTULO_CARGO = /^(?:cargo|cargo de interesse|[aá]rea(?: de interesse)?|[aá]rea profissional|objetivo profissional|position|desired position|professional title)\s*[:\-–—]\s*(.+)$/i;
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
  const linhas = texto.split(/[\r\n]+/).map((line) => line.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const nomeIndex = linhas.findIndex((line) => line.length >= 4 && line.length <= 100 && /\p{L}/u.test(line) && line.split(' ').length >= 2 && !line.includes('@') && !/\d/.test(line) && !HEADING.test(line));
  const nomeCompleto = nomeIndex >= 0 ? linhas[nomeIndex] : undefined;

  // Muitos currículos posicionam o título profissional logo abaixo do nome.
  // Também aceitamos rótulos explícitos e ignoramos contatos e seções nesse intervalo.
  let areaInteresse: string | undefined;
  if (nomeIndex >= 0) {
    for (const linha of linhas.slice(nomeIndex + 1, nomeIndex + 7)) {
      const rotulo = linha.match(ROTULO_CARGO);
      if (rotulo?.[1]) { areaInteresse = rotulo[1].trim().slice(0, 140); break; }
      if (linha.includes('@') || /https?:\/\/|www\.|linkedin|github|\d{5,}/i.test(linha) || ROTULO_TELEFONE.test(linha) || SECTION_HEADING.test(linha)) continue;
      if (/\p{L}/u.test(linha) && linha.length >= 3 && linha.length <= 140) { areaInteresse = linha; break; }
    }
  }

  // Resume apenas o bloco associado a um cabeçalho conhecido, para não converter
  // o currículo inteiro em resumo profissional.
  let resumoProfissional: string | undefined;
  const indiceResumo = linhas.findIndex((linha) => /^(?:resumo(?: profissional)?|perfil(?: profissional)?|sobre mim|summary|professional summary|professional profile)\s*:?\s*(.*)$/i.test(linha.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  if (indiceResumo >= 0) {
    const trecho: string[] = [];
    const titulo = linhas[indiceResumo].match(/^(?:resumo(?: profissional)?|perfil(?: profissional)?|sobre mim|summary|professional summary|professional profile)\s*:?\s*(.*)$/i);
    if (titulo?.[1]) trecho.push(titulo[1]);
    for (const linha of linhas.slice(indiceResumo + 1)) {
      if (SECTION_HEADING.test(linha)) break;
      if (linha) trecho.push(linha);
      if (trecho.join(' ').length >= 3000) break;
    }
    const resumo = trecho.join(' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
    if (resumo.length >= 30) resumoProfissional = resumo;
  }
  return camposExtraidosSchema.parse({
    ...(nomeCompleto ? { nomeCompleto } : {}),
    ...(email ? { email } : {}),
    ...(telefone ? { telefone } : {}),
    ...(areaInteresse ? { areaInteresse } : {}),
    ...(resumoProfissional ? { resumoProfissional } : {})
  });
}

@Injectable()
export class ExtracaoCurriculoService {
  constructor(private readonly ocr: OcrCurriculoClient, private readonly auditoria: AuditoriaService) {}

  async validarParaVisualizacao(buffer: Buffer): Promise<void> {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new UnprocessableEntityException('O arquivo não é um PDF válido para visualização.');
    }
    let tarefa: { promise: Promise<unknown>; destroy: () => Promise<void> } | undefined;
    const inicio = performance.now();
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false });
      const documento = await tarefa.promise as { numPages: number; getPage: (n: number) => Promise<unknown> };
      if (documento.numPages < 1 || documento.numPages > MAX_PAGES) throw new Error('Quantidade de páginas inválida.');
      await documento.getPage(1);
      this.auditoria.registrar('pdf.validacao_visualizacao', {
        resultado: 'valido', paginas: documento.numPages,
        duracaoMs: Math.round(performance.now() - inicio)
      });
    } catch {
      this.auditoria.registrar('pdf.validacao_visualizacao', {
        resultado: 'invalido', duracaoMs: Math.round(performance.now() - inicio)
      });
      throw new UnprocessableEntityException('O PDF não pôde ser validado para visualização. Você pode preencher o cadastro manualmente sem anexar o arquivo.');
    } finally {
      await tarefa?.destroy().catch(() => undefined);
    }
  }

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
