import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { CandidatoResumo } from '@cadastro/contratos';
import { api } from '../api';

export function DetalhePage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [candidato, setCandidato] = useState<CandidatoResumo | null>(null);
  const [erro, setErro] = useState('');
  const [mensagemCurriculo, setMensagemCurriculo] = useState('');
  const [erroCurriculo, setErroCurriculo] = useState('');
  const [enviandoCurriculo, setEnviandoCurriculo] = useState(false);
  const seletorCurriculo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let ativo = true;
    api.detalhar(id).then((result) => { if (ativo) setCandidato(result); }).catch((error: Error) => { if (ativo) setErro(error.message); });
    return () => { ativo = false; };
  }, [id]);

  async function anexarCurriculo(arquivo?: File) {
    if (!arquivo) return;
    setMensagemCurriculo('');
    setErroCurriculo('');
    if (arquivo.size > 5 * 1024 * 1024 || arquivo.type !== 'application/pdf' || !arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErroCurriculo('Selecione um arquivo PDF válido de até 5 MB.');
      if (seletorCurriculo.current) seletorCurriculo.current.value = '';
      return;
    }
    setEnviandoCurriculo(true);
    try {
      await api.anexarCurriculo(id, arquivo);
      const atualizado = await api.detalhar(id);
      setCandidato(atualizado);
      setMensagemCurriculo('Currículo anexado. O botão para visualizar o PDF está disponível.');
    } catch (error) {
      setErroCurriculo(error instanceof Error ? error.message : 'Não foi possível anexar o currículo.');
    } finally {
      setEnviandoCurriculo(false);
      if (seletorCurriculo.current) seletorCurriculo.current.value = '';
    }
  }

  return <section className="detail-page">
    <div className="breadcrumb-page"><Link to="/candidatos">Candidatos</Link><span>/</span><strong>Detalhes</strong></div>
    {location.state?.salvo && <div className="alert alert-success saved-banner" role="status">Candidato cadastrado com sucesso.</div>}
    {erro && <div className="alert alert-error" role="alert">{erro} <Link to="/candidatos">Voltar para a lista</Link></div>}
    {!candidato && !erro && <div className="panel loading-panel">Carregando dados do candidato…</div>}
    {candidato && <>
      <div className="detail-header"><Link className="back-link" to="/candidatos">← Voltar para candidatos</Link><div className="detail-hero"><span className="detail-avatar">{candidato.nomeCompleto.slice(0, 1).toUpperCase()}</span><div><div className="eyebrow">PERFIL DO CANDIDATO</div><h1>{candidato.nomeCompleto}</h1><p>{candidato.areaInteresse || 'Área de interesse não informada'}</p></div></div><div className="detail-actions">{candidato.temCurriculo ? <a className="button button-secondary" href={api.urlCurriculo(candidato.id)} target="_blank" rel="noreferrer">Visualizar currículo PDF</a> : <><input ref={seletorCurriculo} className="sr-only" type="file" accept="application/pdf,.pdf" aria-label="Selecionar currículo PDF" disabled={enviandoCurriculo} onChange={(event) => void anexarCurriculo(event.target.files?.[0])} /><button className="button button-secondary" type="button" disabled={enviandoCurriculo} onClick={() => seletorCurriculo.current?.click()}>{enviandoCurriculo ? 'Anexando currículo…' : 'Anexar currículo PDF'}</button></>}<span className="tag tag-green">Cadastrado</span></div></div>
      {mensagemCurriculo && <div className="alert alert-success" role="status">{mensagemCurriculo}</div>}
      {erroCurriculo && <div className="alert alert-error" role="alert">{erroCurriculo}</div>}
      <div className="detail-grid"><article className="panel detail-card"><h2>Informações de contato</h2><dl><div><dt>E-mail</dt><dd><a href={`mailto:${candidato.email}`}>{candidato.email}</a></dd></div><div><dt>Telefone</dt><dd>{candidato.telefone || 'Não informado'}</dd></div></dl></article>
        <article className="panel detail-card"><h2>Cadastro</h2><dl><div><dt>Área ou cargo de interesse</dt><dd>{candidato.areaInteresse || 'Não informado'}</dd></div><div><dt>Data de cadastro</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(candidato.criadoEm))}</dd></div></dl></article>
        <article className="panel detail-card detail-summary"><h2>Resumo profissional</h2><p className="summary-text">{candidato.resumoProfissional || 'Nenhum resumo profissional informado.'}</p></article>
      </div>
    </>}
  </section>;
}
