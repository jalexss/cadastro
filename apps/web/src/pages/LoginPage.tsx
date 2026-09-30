import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@cadastro/contratos';
import { useAutenticacao } from '../auth-context';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { login } = useAutenticacao();
  const navigate = useNavigate();
  const location = useLocation();

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');
    const dados = loginSchema.safeParse({ email, senha });
    if (!dados.success) { setErro(dados.error.issues[0]?.message ?? 'Revise os dados de acesso.'); return; }
    setEnviando(true);
    try {
      await login(dados.data);
      const origem = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(origem?.startsWith('/candidatos/') ? origem : '/candidatos', { replace: true });
    } catch (error) { setErro((error as Error).message); }
    finally { setEnviando(false); }
  }

  return <section className="auth-page">
    <div className="breadcrumb-page"><Link to="/candidatos/novo">Cadastro público</Link><span>/</span><strong>Acesso da equipe</strong></div>
    <div className="auth-card panel">
      <div className="eyebrow">ÁREA DA RECRUTAMENTO</div>
      <h1>Entrar</h1>
      <p className="muted">Acesse para consultar os perfis cadastrados.</p>
      <form onSubmit={entrar} noValidate>
        <label className="field" htmlFor="login-email"><span className="field-label-row">E-mail</span><input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field" htmlFor="login-senha"><span className="field-label-row">Senha</span><input id="login-senha" type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required /></label>
        {erro && <div role="alert" className="alert alert-error">{erro}</div>}
        <button className="button button-primary auth-submit" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <Link className="auth-public-link" to="/candidatos/novo">Cadastrar candidato sem login</Link>
    </div>
  </section>;
}
