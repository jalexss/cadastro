import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CadastroPage } from './CadastroPage';
import { ProvedorAutenticacao } from '../auth-context';

function renderCadastro() {
  return render(<MemoryRouter><ProvedorAutenticacao><CadastroPage /></ProvedorAutenticacao></MemoryRouter>);
}

vi.mock('../api', () => ({
  api: {
    sessao: vi.fn(async () => null),
    login: vi.fn(),
    logout: vi.fn(),
    extrair: vi.fn(async () => ({ campos: { nomeCompleto: 'Ana Silva', email: 'ana@example.com' } })),
    criar: vi.fn(async () => ({ id: '45c29c2e-77e4-4b13-90a4-d5e7ea82362b', criadoEm: new Date().toISOString() }))
  }
}));

describe('formulário de cadastro', () => {
  it('valida campos obrigatórios no mesmo formulário', async () => {
    renderCadastro();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar candidato' }));
    await waitFor(() => {
      expect(screen.getByText('Informe o nome completo.')).toBeInTheDocument();
      expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    }, { timeout: 10_000 });
  });

  it('preenche sugestões do PDF e mantém campos editáveis', async () => {
    renderCadastro();
    const file = new File(['%PDF-1.7 conteúdo'], 'curriculo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Selecionar currículo em PDF'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText(/Nome completo/)).toHaveValue('Ana Silva'));
    expect(screen.getByLabelText('E-mail *')).toHaveValue('ana@example.com');
    expect(screen.getByRole('status')).toHaveTextContent('Confira e complete os dados');
  });

  it('mostra erro de arquivo inválido sem desabilitar o cadastro manual', async () => {
    renderCadastro();
    const file = new File(['conteúdo'], 'curriculo.doc', { type: 'application/msword' });
    fireEvent.change(screen.getByLabelText('Selecionar currículo em PDF'), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um arquivo PDF válido');
    expect(screen.getByRole('button', { name: 'Salvar candidato' })).toBeEnabled();
  });

  it('mostra a marca obrigatória ao lado do nome do campo', () => {
    renderCadastro();
    const nome = screen.getByLabelText(/Nome completo/);
    const linhaRotulo = nome.closest('label')?.querySelector('.field-label-row');
    expect(linhaRotulo).toHaveTextContent('Nome completo *');
    expect(linhaRotulo?.querySelector('.required')).toBeInTheDocument();
  });

  it('confirma o cadastro público sem abrir os dados do candidato', async () => {
    const user = userEvent.setup();
    renderCadastro();
    await user.type(screen.getByLabelText(/Nome completo/), 'Ana Silva');
    await user.type(screen.getByLabelText(/E-mail/), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Salvar candidato' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Cadastro realizado com sucesso');
    expect(screen.getByRole('link', { name: 'Entrar para consultar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Detalhes do candidato')).not.toBeInTheDocument();
  });
});
