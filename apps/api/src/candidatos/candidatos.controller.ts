import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { candidatoSchema, paginaSchema } from '@cadastro/contratos';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CandidatosService } from './candidatos.service';
import { ExtracaoCurriculoService } from './extracao-curriculo.service';
import { SessaoGuard } from '../auth/sessao.guard';

const LIMITE_PDF = 5 * 1024 * 1024;

@Controller('candidatos')
export class CandidatosController {
  constructor(private readonly candidatos: CandidatosService, private readonly extracao: ExtracaoCurriculoService) {}

  @Post('extrair-curriculo')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: memoryStorage(),
    limits: { fileSize: LIMITE_PDF, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return callback(new BadRequestException('Envie um arquivo PDF válido.'), false);
      callback(null, true);
    }
  }))
  async extrairCurriculo(@UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Selecione um arquivo PDF de até 5 MB.');
    if (arquivo.size > LIMITE_PDF || arquivo.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new BadRequestException('Envie um arquivo PDF válido de até 5 MB.');
    return { campos: await this.extracao.extrair(arquivo.buffer) };
  }

  @Post()
  @UseInterceptors(FileInterceptor('curriculo', {
    storage: memoryStorage(),
    limits: { fileSize: LIMITE_PDF, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return callback(new BadRequestException('Envie um arquivo PDF válido.'), false);
      callback(null, true);
    }
  }))
  async criar(@Body() body: unknown, @UploadedFile() arquivo?: Express.Multer.File) {
    let dados = body;
    if (body && typeof body === 'object' && 'dados' in body) {
      try { dados = JSON.parse(String((body as { dados: unknown }).dados)); }
      catch { throw new BadRequestException('Os dados do cadastro não estão em um formato válido.'); }
    }
    const input = new ZodValidationPipe(candidatoSchema).transform(dados, { type: 'body', metatype: Object }) as never;
    if (arquivo) {
      if (arquivo.size > LIMITE_PDF || arquivo.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new BadRequestException('Envie um arquivo PDF válido de até 5 MB.');
      }
      await this.extracao.validarParaVisualizacao(arquivo.buffer);
    }
    const salvo = await this.candidatos.criar(input, arquivo?.buffer);
    return { id: salvo.id, criadoEm: salvo.criadoEm.toISOString() };
  }

  @Get()
  @UseGuards(SessaoGuard)
  listar(@Query(new ZodValidationPipe(paginaSchema)) query: { pagina: number; limite: number }) {
    return this.candidatos.listar(query.pagina, query.limite);
  }

  @Get(':id')
  @UseGuards(SessaoGuard)
  detalhar(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.candidatos.buscarPorId(id);
  }

  @Get(':id/curriculo')
  @UseGuards(SessaoGuard)
  async visualizarCurriculo(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res() response: Response
  ) {
    const arquivo = await this.candidatos.buscarCurriculoPdf(id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="curriculo-${id}.pdf"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(arquivo);
  }

  @Put(':id/curriculo')
  @UseGuards(SessaoGuard)
  @UseInterceptors(FileInterceptor('curriculo', {
    storage: memoryStorage(),
    limits: { fileSize: LIMITE_PDF, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return callback(new BadRequestException('Envie um arquivo PDF válido.'), false);
      callback(null, true);
    }
  }))
  async anexarCurriculo(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() arquivo?: Express.Multer.File
  ) {
    if (!arquivo) throw new BadRequestException('Selecione um arquivo PDF de até 5 MB.');
    if (arquivo.size > LIMITE_PDF || arquivo.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('Envie um arquivo PDF válido de até 5 MB.');
    }
    await this.extracao.validarParaVisualizacao(arquivo.buffer);
    await this.candidatos.anexarCurriculoPdf(id, arquivo.buffer);
    return { temCurriculo: true };
  }
}
