import type { CandidatoInput, CandidatoCriado, CandidatoResumo, ListaCandidatos, CamposExtraidos, LoginInput, SessaoRecrutador } from '@cadastro/contratos';
import { registrarMedida } from './desempenho';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const inicio = performance.now();
  let status = 'erro';
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include' });
    status = String(response.status);
    const requestId = response.headers.get('x-request-id');
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('sessao-expirada'));
      const body = await response.json().catch(() => ({})) as { message?: string | string[] };
      const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      throw new Error(message || `Não foi possível concluir a solicitação${requestId ? ` (${requestId})` : ''}.`);
    }
    return await response.json() as T;
  } finally {
    const method = (init?.method ?? 'GET').toUpperCase();
    registrarMedida({ nome: `${method} ${path.split('?')[0]} · ${status}`, valor: `${(performance.now() - inicio).toFixed(0)} ms`, origem: 'API' });
  }
}

export const api = {
  async sessao(): Promise<SessaoRecrutador | null> {
    try { return (await request<{ recrutador: SessaoRecrutador }>('/auth/sessao')).recrutador; }
    catch { return null; }
  },
  login(input: LoginInput) {
    return request<{ recrutador: SessaoRecrutador }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  },
  logout() {
    return request<{ encerrada: boolean }>('/auth/logout', { method: 'POST' });
  },
  listar(pagina: number, limite: number) {
    return request<ListaCandidatos>(`/candidatos?pagina=${pagina}&limite=${limite}`);
  },
  detalhar(id: string) {
    return request<CandidatoResumo>(`/candidatos/${encodeURIComponent(id)}`);
  },
  criar(candidato: CandidatoInput) {
    return request<CandidatoCriado>('/candidatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidato) });
  },
  extrair(arquivo: File) {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return request<{ campos: CamposExtraidos }>('/candidatos/extrair-curriculo', { method: 'POST', body: form });
  }
};
