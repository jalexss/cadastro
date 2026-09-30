import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
  return render(<MemoryRouter><ProvedorAutenticacao><LoginPage /></ProvedorAutenticacao></MemoryRouter>);
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
});
