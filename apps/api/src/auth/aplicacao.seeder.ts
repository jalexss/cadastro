import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { hash, argon2id } from 'argon2';
import { candidatoSchema, loginSchema } from '@cadastro/contratos';
import { Persistencia, PERSISTENCIA } from '../database/persistencia';
import { AuditoriaService } from '../auditoria/auditoria.service';

const candidatosSinteticos = [
  { nomeCompleto: 'Ana Demonstração', email: 'ana.demo@example.test', areaInteresse: 'Engenharia de Software' },
  { nomeCompleto: 'Rui Exemplo', email: 'rui.exemplo@example.test', areaInteresse: 'Desenvolvimento de Produtos' }
];

@Injectable()
export class AplicacaoSeeder implements OnModuleInit {
  constructor(@Inject(PERSISTENCIA) private readonly persistencia: Persistencia, private readonly auditoria: AuditoriaService) {}

  async onModuleInit(): Promise<void> {
    const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const senha = process.env.AUTH_BOOTSTRAP_PASSWORD;
    const conta = loginSchema.safeParse({ email, senha });
    if (!conta.success || !senha || senha.length < 14) {
      throw new Error('Defina AUTH_BOOTSTRAP_EMAIL e AUTH_BOOTSTRAP_PASSWORD (mínimo de 14 caracteres) no arquivo .env.');
    }
    const credenciais = conta.data;
    if (!(await this.persistencia.buscarRecrutadorPorEmail(credenciais.email))) {
      const senhaHash = await hash(senha, { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
      await this.persistencia.criarRecrutador(credenciais.email, senhaHash);
      this.auditoria.registrar('seed.recrutador', { resultado: 'criado' });
    } else {
      this.auditoria.registrar('seed.recrutador', { resultado: 'existente' });
    }
    if (process.env.SEED_DEMO_DATA === 'true') {
      let criados = 0;
      for (const data of candidatosSinteticos) {
        if (!(await this.persistencia.existeCandidatoComEmail(data.email))) {
          await this.persistencia.criarCandidato(candidatoSchema.parse(data));
          criados += 1;
        }
      }
      this.auditoria.registrar('seed.candidatos', { resultado: 'concluido', quantidadeCriada: criados });
    }
  }
}
