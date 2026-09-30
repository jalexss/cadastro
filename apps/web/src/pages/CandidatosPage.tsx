import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ListaCandidatos } from '@cadastro/contratos';
import { api } from '../api';

export function CandidatosPage() {
  const [lista, setLista] = useState<ListaCandidatos | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    api.listar(pagina, 10).then((resultado) => { if (ativo) { setLista(resultado); setErro(''); } })
      .catch((error: Error) => { if (ativo) setErro(error.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [pagina]);

  const totalPaginas = Math.max(1, Math.ceil((lista?.total ?? 0) / 10));
  return (
    <section>
      <div className="page-heading">
        <div><div className="eyebrow">BANCO DE TALENTOS</div><h1>Candidatos</h1><p className="muted">Organize e acompanhe os perfis cadastrados.</p></div>
        <Link className="button button-primary" to="/candidatos/novo"><span aria-hidden="true">＋</span> Novo candidato</Link>
      </div>
      <div className="summary-row">
        <div className="summary-card"><span className="summary-icon">♙</span><div><span className="summary-label">Candidatos cadastrados</span><strong>{lista?.total ?? '—'}</strong></div></div>
        <div className="summary-note"><span className="summary-pulse" /> Seus talentos em um só lugar</div>
      </div>
      <div className="table-card">
        <div className="table-header"><div><h2>Todos os candidatos</h2><p>Perfis adicionados ao banco de talentos</p></div><span className="count-pill">{lista?.total ?? 0} perfis</span></div>
        {erro && <div role="alert" className="alert alert-error">{erro} <button className="text-button" onClick={() => setPagina(1)}>Tentar novamente</button></div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>NOME</th><th>E-MAIL</th><th>ÁREA DE INTERESSE</th><th>CADASTRADO EM</th><th><span className="sr-only">Ação</span></th></tr></thead>
            <tbody>
              {carregando && <tr><td colSpan={5} className="empty-state">Carregando candidatos…</td></tr>}
              {!carregando && !erro && lista?.itens.length === 0 && <tr><td colSpan={5} className="empty-state"><span className="empty-icon">♙</span><strong>Nenhum candidato por aqui</strong><span>Comece adicionando o primeiro perfil ao seu banco de talentos.</span><Link className="button button-secondary" to="/candidatos/novo">Cadastrar candidato</Link></td></tr>}
              {!carregando && lista?.itens.map((candidato) => <tr key={candidato.id}>
                <td><Link className="candidate-name" to={`/candidatos/${candidato.id}`}><span className="candidate-avatar">{candidato.nomeCompleto.slice(0, 1).toUpperCase()}</span>{candidato.nomeCompleto}</Link></td>
                <td className="muted">{candidato.email}</td><td>{candidato.areaInteresse || <span className="muted">Não informado</span>}</td>
                <td className="muted">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(candidato.criadoEm))}</td>
                <td><div className="table-actions">
                  {candidato.temCurriculo && <a className="row-action row-action-pdf" aria-label={`Visualizar currículo PDF de ${candidato.nomeCompleto}`} title="Visualizar currículo PDF" href={api.urlCurriculo(candidato.id)} target="_blank" rel="noreferrer">PDF</a>}
                  <Link className="row-action" aria-label={`Ver ${candidato.nomeCompleto}`} to={`/candidatos/${candidato.id}`}>→</Link>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="pagination"><span>Mostrando {lista?.itens.length ?? 0} de {lista?.total ?? 0} candidatos</span><div className="pagination-controls"><button disabled={pagina <= 1 || carregando} aria-label="Página anterior" onClick={() => setPagina((value) => Math.max(1, value - 1))}>←</button><span>Página {pagina} de {totalPaginas}</span><button disabled={pagina >= totalPaginas || carregando} aria-label="Próxima página" onClick={() => setPagina((value) => Math.min(totalPaginas, value + 1))}>→</button></div></div>
      </div>
    </section>
  );
}
