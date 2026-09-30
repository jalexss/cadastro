import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { CandidatoResumo } from '@cadastro/contratos';
import { api } from '../api';

export function DetalhePage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [candidato, setCandidato] = useState<CandidatoResumo | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let ativo = true;
    api.detalhar(id).then((result) => { if (ativo) setCandidato(result); }).catch((error: Error) => { if (ativo) setErro(error.message); });
    return () => { ativo = false; };
  }, [id]);

  return <section className="detail-page">
    <div className="breadcrumb-page"><Link to="/candidatos">Candidatos</Link><span>/</span><strong>Detalhes</strong></div>
    {location.state?.salvo && <div className="alert alert-success saved-banner" role="status">Candidato cadastrado com sucesso.</div>}
    {erro && <div className="alert alert-error" role="alert">{erro} <Link to="/candidatos">Voltar para a lista</Link></div>}
    {!candidato && !erro && <div className="panel loading-panel">Carregando dados do candidato…</div>}
    {candidato && <>
      <div className="detail-header"><Link className="back-link" to="/candidatos">← Voltar para candidatos</Link><div className="detail-hero"><span className="detail-avatar">{candidato.nomeCompleto.slice(0, 1).toUpperCase()}</span><div><div className="eyebrow">PERFIL DO CANDIDATO</div><h1>{candidato.nomeCompleto}</h1><p>{candidato.areaInteresse || 'Área de interesse não informada'}</p></div></div><span className="tag tag-green">Cadastrado</span></div>
      <div className="detail-grid"><article className="panel detail-card"><h2>Informações de contato</h2><dl><div><dt>E-mail</dt><dd><a href={`mailto:${candidato.email}`}>{candidato.email}</a></dd></div><div><dt>Telefone</dt><dd>{candidato.telefone || 'Não informado'}</dd></div></dl></article>
        <article className="panel detail-card"><h2>Cadastro</h2><dl><div><dt>Área ou cargo de interesse</dt><dd>{candidato.areaInteresse || 'Não informado'}</dd></div><div><dt>Data de cadastro</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(candidato.criadoEm))}</dd></div></dl></article>
        <article className="panel detail-card detail-summary"><h2>Resumo profissional</h2><p className="summary-text">{candidato.resumoProfissional || 'Nenhum resumo profissional informado.'}</p></article>
      </div>
    </>}
  </section>;
}
