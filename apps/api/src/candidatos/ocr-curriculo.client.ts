import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';

const TAMANHO_MAXIMO_TEXTO = 100_000;
const TEMPO_LIMITE_MS = 45_000;

@Injectable()
export class OcrCurriculoClient {
  private emExecucao = 0;

  constructor(private readonly auditoria: AuditoriaService) {}

  async extrairTexto(pdf: Buffer): Promise<string> {
    if (this.emExecucao >= 2) throw new ServiceUnavailableException('A leitura de currículos está ocupada. Tente novamente ou preencha o cadastro manualmente.');
    this.emExecucao += 1;
    const inicio = performance.now();
    const url = process.env.OCR_TEXTO_URL ?? 'http://ocr:8081/extrair';
    try {
      const resposta = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/pdf' },
        body: new Uint8Array(pdf),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
      });
      if (!resposta.ok) throw new Error(`ocr-status-${resposta.status}`);
      const dados = await resposta.json() as { texto?: unknown };
      if (typeof dados.texto !== 'string' || dados.texto.length > TAMANHO_MAXIMO_TEXTO) throw new Error('ocr-response-invalid');
      this.auditoria.registrar('pdf.ocr', { resultado: dados.texto.trim() ? 'texto_extraido' : 'sem_texto', duracaoMs: Math.round(performance.now() - inicio) });
      return dados.texto;
    } catch {
      this.auditoria.registrar('pdf.ocr', { resultado: 'falha', duracaoMs: Math.round(performance.now() - inicio) });
      throw new ServiceUnavailableException('Não foi possível ler o PDF agora. Você pode preencher o cadastro manualmente.');
    } finally {
      this.emExecucao -= 1;
    }
  }
}
