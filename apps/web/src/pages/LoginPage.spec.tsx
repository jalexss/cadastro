import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api';
import { ProvedorAutenticacao } from '../auth-context';
import { LoginPage } from './LoginPage';

vi.mock('../api', () => ({
  api: {
    sessao: vi.fn(async () => null),
    login: vi.fn(async () => { throw new Error('E-mail ou senha inválidos.'); }),
    logout: vi.fn()
  }
}));

function renderLogin() {
  return render(<MemoryRouter initialEntries={['/login']}><ProvedorAutenticacao><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/candidatos" element={<h1>Banco de candidatos</h1>} />
  </Routes></ProvedorAutenticacao></MemoryRouter>);
}

describe('tela de login', () => {
  it('mostra erro local para e-mail malformado e não chama a API', async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockClear();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'recrutador@');
    await user.type(screen.getByLabelText('Senha'), 'senha de teste');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('e-mail válido');
    expect(api.login).not.toHaveBeenCalled();
  });

  it('exibe a mensagem genérica da API para credenciais incorretas', async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockClear();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'recrutador@example.test');
    await user.type(screen.getByLabelText('Senha'), 'senha errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(api.login).toHaveBeenCalledWith({ email: 'recrutador@example.test', senha: 'senha errada' });
  });

  it('faz login válido e navega para a listagem de candidatos', async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockResolvedValue({ recrutador: { id: 'recrutador-1', email: 'recrutador@example.test' } });
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'recrutador@example.test');
    await user.type(screen.getByLabelText('Senha'), 'senha segura de teste');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Banco de candidatos' })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith({ email: 'recrutador@example.test', senha: 'senha segura de teste' });
  });
});
