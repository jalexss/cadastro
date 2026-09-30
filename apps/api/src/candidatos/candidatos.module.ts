import { Module } from '@nestjs/common';
import { CandidatosController } from './candidatos.controller';
import { CandidatosService } from './candidatos.service';
import { ExtracaoCurriculoService } from './extracao-curriculo.service';
import { OcrCurriculoClient } from './ocr-curriculo.client';

@Module({
  controllers: [CandidatosController],
  providers: [CandidatosService, ExtracaoCurriculoService, OcrCurriculoClient]
})
export class CandidatosModule {}
