import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { candidatoSchema, paginaSchema } from '@cadastro/contratos';
import { memoryStorage } from 'multer';
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
  async criar(@Body(new ZodValidationPipe(candidatoSchema)) body: unknown) {
    const salvo = await this.candidatos.criar(body as never);
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
}
