import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { OcrCurriculoClient } from './ocr-curriculo.client';

describe('OcrCurriculoClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('registra timeout sem expor conteúdo e permite cadastro manual', async () => {
    const registrar = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    const cliente = new OcrCurriculoClient({ registrar } as never);

    await expect(cliente.extrairTexto(Buffer.from('%PDF-1.7 texto sigiloso')))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(registrar).toHaveBeenCalledWith('pdf.ocr', expect.objectContaining({ resultado: 'falha' }));
    expect(JSON.stringify(registrar.mock.calls)).not.toContain('sigiloso');
  });

  it('rejeita resposta grande ou malformada do serviço local', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ texto: 'x'.repeat(100_001) }), { status: 200 }));
    const cliente = new OcrCurriculoClient({ registrar: vi.fn() } as never);
    await expect(cliente.extrairTexto(Buffer.from('%PDF-1.7'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
