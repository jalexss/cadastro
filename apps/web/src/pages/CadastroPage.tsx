import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { candidatoSchema, type CandidatoInput } from '@cadastro/contratos';
import { api } from '../api';
import { useAutenticacao } from '../auth-context';

const initialValues: CandidatoInput = { nomeCompleto: '', email: '', telefone: '', areaInteresse: '', resumoProfissional: '' };

export function CadastroPage() {
  const [form, setForm] = useState<CandidatoInput>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState('');
  const [erroArquivo, setErroArquivo] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [arquivoCurriculo, setArquivoCurriculo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { recrutador } = useAutenticacao();

  function alterar(campo: keyof CandidatoInput, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErrors((atual) => ({ ...atual, [campo]: '' }));
  }

  async function processarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setErroArquivo(''); setAviso(''); setArquivoNome(arquivo.name); setArquivoCurriculo(null);
    if (arquivo.size > 5 * 1024 * 1024 || !arquivo.name.toLowerCase().endsWith('.pdf') || (arquivo.type && arquivo.type !== 'application/pdf')) {
      setErroArquivo('Escolha um arquivo PDF válido de até 5 MB. Você ainda pode preencher o cadastro manualmente.');
      event.target.value = '';
      return;
    }
    setEnviando(true);
    try {
      const { campos } = await api.extrair(arquivo);
      setArquivoCurriculo(arquivo);
      setForm((atual) => ({ ...atual, ...campos }));
      setAviso(Object.keys(campos).length ? 'Currículo lido. Confira e complete os dados antes de salvar.' : 'O currículo foi lido, mas não encontramos dados para preencher. Complete o formulário manualmente.');
    } catch (error) {
      setErroArquivo(`${(error as Error).message} Seus dados continuam disponíveis para o cadastro manual.`);
    } finally { setEnviando(false); }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resultado = candidatoSchema.safeParse(form);
    if (!resultado.success) {
      const nextErrors: Record<string, string> = {};
      resultado.error.issues.forEach((issue) => { nextErrors[String(issue.path[0])] = issue.message; });
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    setSalvando(true);
    try {
      const salvo = arquivoCurriculo
        ? await api.criar(resultado.data, arquivoCurriculo)
        : await api.criar(resultado.data);
      if (recrutador) navigate(`/candidatos/${salvo.id}`, { state: { salvo: true } });
      else { setForm(initialValues); setArquivoNome(''); setArquivoCurriculo(null); setConcluido(true); }
    }
    catch (error) { setAviso(''); setErroArquivo((error as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <section className="form-page">
      <div className="breadcrumb-page"><Link to={recrutador ? '/candidatos' : '/candidatos/novo'}>{recrutador ? 'Candidatos' : 'Cadastro público'}</Link><span>/</span><strong>Novo cadastro</strong></div>
      <div className="page-heading form-heading"><div><div className="eyebrow">NOVO PERFIL</div><h1>Cadastrar candidato</h1><p className="muted">Preencha os dados manualmente ou use um currículo para começar.</p></div></div>
      {concluido ? <div className="panel public-success" role="status">
        <span className="success-check" aria-hidden="true">✓</span>
        <h2>Cadastro realizado com sucesso.</h2>
        <p>O perfil foi encaminhado para a equipe de recrutamento.</p>
        <div className="form-actions public-success-actions"><Link className="button button-primary" to="/login">Entrar para consultar</Link><button className="button button-secondary" onClick={() => setConcluido(false)}>Cadastrar outro candidato</button></div>
      </div> : <div className="form-layout">
        <div className="form-main">
          <form className="panel form-panel" onSubmit={salvar} noValidate>
            <div className="section-title"><span className="step-number">01</span><div><h2>Dados do candidato</h2><p>As informações com <span className="required">*</span> são obrigatórias.</p></div></div>
            <div className="form-grid">
              <label className="field field-full" htmlFor="nomeCompleto"><span className="field-label-row">Nome completo <span className="required" aria-hidden="true">*</span></span><input id="nomeCompleto" required autoComplete="name" placeholder="Ex.: Ana Souza" value={form.nomeCompleto} onChange={(event) => alterar('nomeCompleto', event.target.value)} aria-invalid={Boolean(errors.nomeCompleto)} aria-describedby={errors.nomeCompleto ? 'erro-nome' : undefined} />{errors.nomeCompleto && <span id="erro-nome" className="field-error">{errors.nomeCompleto}</span>}</label>
              <label className="field" htmlFor="email"><span className="field-label-row">E-mail <span className="required" aria-hidden="true">*</span></span><input id="email" type="email" required autoComplete="email" placeholder="ana@email.com" value={form.email} onChange={(event) => alterar('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'erro-email' : undefined} />{errors.email && <span id="erro-email" className="field-error">{errors.email}</span>}</label>
              <label className="field" htmlFor="telefone">Telefone<input id="telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.telefone ?? ''} onChange={(event) => alterar('telefone', event.target.value)} /></label>
              <label className="field field-full" htmlFor="areaInteresse">Área ou cargo de interesse<input id="areaInteresse" placeholder="Ex.: Desenvolvimento Front-end" value={form.areaInteresse ?? ''} onChange={(event) => alterar('areaInteresse', event.target.value)} /></label>
              <label className="field field-full" htmlFor="resumoProfissional">Resumo profissional<textarea id="resumoProfissional" rows={5} placeholder="Conte um pouco sobre a experiência, os interesses e os objetivos profissionais do candidato…" value={form.resumoProfissional ?? ''} onChange={(event) => alterar('resumoProfissional', event.target.value)} /><span className="field-hint">Até 3.000 caracteres.</span></label>
            </div>
            {erroArquivo && <div className="alert alert-error" role="alert">{erroArquivo}</div>}
            <div className="form-actions"><Link className="button button-ghost" to={recrutador ? '/candidatos' : '/candidatos/novo'}>Cancelar</Link><button className="button button-primary" type="submit" disabled={salvando}>{salvando && <span className="spinner" aria-hidden="true" />}{salvando ? 'Salvando…' : 'Salvar candidato'}</button></div>
          </form>
        </div>
        <aside className="form-aside">
          <div className="panel upload-panel"><div className="upload-icon">↑</div><div className="upload-title">Comece pelo currículo</div><p>Enviaremos o PDF para sugerir dados. Você poderá revisar e editar tudo; após salvar, a equipe poderá consultar o arquivo.</p>
            <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={processarArquivo} aria-label="Selecionar currículo em PDF" />
            <button type="button" className="button button-secondary upload-button" onClick={() => inputRef.current?.click()} disabled={enviando}>{enviando ? <><span className="spinner" /> Lendo currículo…</> : arquivoNome ? 'Escolher outro PDF' : 'Selecionar currículo PDF'}</button>
            {arquivoNome && <div className="file-name">▧ {arquivoNome}</div>}
            {aviso && <div className="alert alert-success" role="status">{aviso}</div>}
            <span className="upload-footnote">PDF até 5 MB · Opcional</span>
          </div>
          <div className="privacy-note"><span aria-hidden="true">⌑</span><div><strong>Seus dados estão protegidos</strong><p>O PDF anexado fica disponível somente para a equipe autenticada consultar o perfil.</p></div></div>
        </aside>
      </div>}
    </section>
  );
}
