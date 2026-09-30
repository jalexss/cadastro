import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginInput, SessaoRecrutador } from '@cadastro/contratos';
import { api } from './api';

interface EstadoAutenticacao {
  recrutador: SessaoRecrutador | null;
  carregando: boolean;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
}

const ContextoAutenticacao = createContext<EstadoAutenticacao | null>(null);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [recrutador, setRecrutador] = useState<SessaoRecrutador | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    const expirada = () => { if (ativo) setRecrutador(null); };
    window.addEventListener('sessao-expirada', expirada);
    api.sessao().then((sessao) => { if (ativo) setRecrutador(sessao); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; window.removeEventListener('sessao-expirada', expirada); };
  }, []);

  const value = useMemo<EstadoAutenticacao>(() => ({
    recrutador,
    carregando,
    async login(input) { const result = await api.login(input); setRecrutador(result.recrutador); },
    async logout() { try { await api.logout(); } finally { setRecrutador(null); } }
  }), [recrutador, carregando]);

  return <ContextoAutenticacao.Provider value={value}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): EstadoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAutenticacao precisa estar dentro de ProvedorAutenticacao.');
  return contexto;
}
