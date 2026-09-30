import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CadastroPage } from './pages/CadastroPage';
import { CandidatosPage } from './pages/CandidatosPage';
import { DetalhePage } from './pages/DetalhePage';
import { LoginPage } from './pages/LoginPage';
import { PainelDesempenho } from './components/PainelDesempenho';
import { ProvedorAutenticacao, useAutenticacao } from './auth-context';

function RequerSessao() {
  const { recrutador, carregando } = useAutenticacao();
  const location = useLocation();
  if (carregando) return <div className="panel loading-panel" role="status">Verificando acesso…</div>;
  return recrutador ? <Outlet /> : <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />;
}

function Inicio() {
  const { recrutador, carregando } = useAutenticacao();
  if (carregando) return <div className="panel loading-panel" role="status">Verificando acesso…</div>;
  return <Navigate to={recrutador ? '/candidatos' : '/candidatos/novo'} replace />;
}

function LayoutAutenticado() {
  const [painelAberto, setPainelAberto] = useState(false);
  const { recrutador, logout } = useAutenticacao();
  const navigate = useNavigate();

  async function sair() {
    await logout();
    navigate('/candidatos/novo', { replace: true });
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to={recrutador ? '/candidatos' : '/candidatos/novo'} aria-label="Talento, página inicial">
        <span className="brand-mark">t.</span><span>talento<span className="brand-dot">.</span></span>
      </Link>
      <div className="workspace-label">{recrutador ? 'RECRUTAMENTO' : 'CADASTRO DE CANDIDATOS'}</div>
      <nav className="side-nav" aria-label="Navegação principal">
        {recrutador && <NavLink to="/candidatos" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">▤</span> Candidatos
        </NavLink>}
        <NavLink to="/candidatos/novo" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">＋</span> Novo cadastro
        </NavLink>
      </nav>
      <div className="sidebar-bottom"><span className="status-dot" /> Ambiente local</div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>{recrutador ? 'Recrutamento' : 'Talentos'}</span><span className="crumb-sep">/</span><strong>{recrutador ? 'Banco de talentos' : 'Novo cadastro'}</strong></div>
        <div className="topbar-actions">
          {import.meta.env.DEV && <button className="icon-button" aria-label="Abrir diagnóstico de desempenho" onClick={() => setPainelAberto(true)} title="Diagnóstico local">◷</button>}
          {recrutador ? <><span className="session-email">{recrutador.email}</span><button className="button button-ghost logout-button" onClick={() => void sair()}>Sair</button></> : <Link className="button button-ghost login-link" to="/login">Entrar</Link>}
        </div>
      </header>
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/candidatos/novo" element={<CadastroPage />} />
          <Route element={<RequerSessao />}>
            <Route path="/candidatos" element={<CandidatosPage />} />
            <Route path="/candidatos/:id" element={<DetalhePage />} />
          </Route>
          <Route path="*" element={<Inicio />} />
        </Routes>
      </div>
      <footer className="page-footer">Talento <span>·</span> Gestão de candidatos</footer>
    </main>
    {import.meta.env.DEV && <PainelDesempenho aberto={painelAberto} fechar={() => setPainelAberto(false)} />}
  </div>;
}

export function App() {
  return <ProvedorAutenticacao><LayoutAutenticado /></ProvedorAutenticacao>;
}
