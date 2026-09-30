import { useEffect, useState } from 'react';
import { lerMedidas, type Medida } from '../desempenho';

export function PainelDesempenho({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const [medidas, setMedidas] = useState<Medida[]>([]);
  useEffect(() => {
    if (!aberto) return;
    const atualizar = () => setMedidas(lerMedidas());
    atualizar();
    const timer = window.setInterval(atualizar, 1000);
    return () => window.clearInterval(timer);
  }, [aberto]);
  if (!aberto) return null;
  return <div className="perf-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) fechar(); }}>
    <section className="perf-panel" role="dialog" aria-modal="true" aria-labelledby="perf-title">
      <div className="perf-head"><div><span className="eyebrow">SOMENTE NESTE NAVEGADOR</span><h2 id="perf-title">Diagnóstico de desempenho</h2></div><button className="icon-button" aria-label="Fechar diagnóstico" onClick={fechar}>×</button></div>
      <p className="muted">Métricas de carregamento e renderização. Os dados não são enviados a serviços externos.</p>
      <div className="perf-list">{medidas.length ? medidas.map((item) => <div className="perf-row" key={`${item.origem}-${item.nome}`}><span><strong>{item.nome}</strong><small>{item.origem}</small></span><b>{item.valor}</b></div>) : <div className="empty-state">As métricas aparecem enquanto você navega.</div>}</div>
    </section>
  </div>;
}
