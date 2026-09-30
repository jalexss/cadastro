import { z } from 'zod';

const emailSchema = z.string().trim().pipe(z.email({ error: 'Informe um e-mail válido.' }).max(254));

export const candidatoSchema = z.object({
  nomeCompleto: z.string().trim().min(1, 'Informe o nome completo.').max(160),
  email: emailSchema,
  telefone: z.string().trim().max(40).optional().or(z.literal('')),
  areaInteresse: z.string().trim().max(140).optional().or(z.literal('')),
  resumoProfissional: z.string().trim().max(3000).optional().or(z.literal(''))
}).strict();

export const camposExtraidosSchema = z.object({
  nomeCompleto: z.string().max(160).optional(),
  email: emailSchema.optional(),
  telefone: z.string().max(40).optional(),
  areaInteresse: z.string().max(140).optional(),
  resumoProfissional: z.string().max(3000).optional()
}).strict();

export const paginaSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20)
});

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha.').max(128).refine((senha) => senha.trim().length > 0, 'Informe uma senha que não seja composta apenas por espaços.')
}).strict();

export type CandidatoInput = z.infer<typeof candidatoSchema>;
export type CamposExtraidos = z.infer<typeof camposExtraidosSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface SessaoRecrutador {
  id: string;
  email: string;
}

export interface CandidatoCriado {
  id: string;
  criadoEm: string;
}

export interface CandidatoResumo extends CandidatoInput {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ListaCandidatos {
  itens: Array<Pick<CandidatoResumo, 'id' | 'nomeCompleto' | 'email' | 'areaInteresse' | 'criadoEm'>>;
  pagina: number;
  limite: number;
  total: number;
}
