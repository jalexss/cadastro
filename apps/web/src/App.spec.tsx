import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from './api';
import { App } from './App';

vi.mock('./pages/CandidatosPage', () => ({ CandidatosPage: () => <h1>Candidatos</h1> }));
vi.mock('./pages/CadastroPage', () => ({ CadastroPage: () => <h1>Cadastrar candidato</h1> }));
vi.mock('./pages/DetalhePage', () => ({ DetalhePage: () => <h1>Detalhes do candidato</h1> }));
vi.mock('./pages/LoginPage', () => ({ LoginPage: () => <h1>Entrar na equipe</h1> }));
vi.mock('./api', () => ({ api: { sessao: vi.fn(async () => null), login: vi.fn(), logout: vi.fn() } }));

describe('navegação da aplicação', () => {
  it('redireciona pessoa sem sessão da lista para o login', async () => {
    vi.mocked(api.sessao).mockResolvedValue(null);
    render(<MemoryRouter initialEntries={['/candidatos']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Entrar na equipe' })).toBeInTheDocument();
  });

  it('abre a lista para recrutador autenticado', async () => {
    vi.mocked(api.sessao).mockResolvedValue({ id: 'recrutador-1', email: 'equipe@example.test' });
    render(<MemoryRouter initialEntries={['/candidatos']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Candidatos' })).toBeInTheDocument();
  });

  it('mantém o cadastro público disponível sem sessão', () => {
    vi.mocked(api.sessao).mockResolvedValue(null);
    render(<MemoryRouter initialEntries={['/candidatos/novo']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Cadastrar candidato' })).toBeInTheDocument();
  });
});
