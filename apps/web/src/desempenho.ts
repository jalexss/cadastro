export type Medida = { nome: string; valor: string; origem: string };

const medidas = new Map<string, Medida>();
export function registrarMedida(medida: Medida): void {
  medidas.set(`${medida.origem}:${medida.nome}`, medida);
}
export function lerMedidas(): Medida[] {
  return [...medidas.values()];
}

export function observarWebVitals(): void {
  if (!import.meta.env.DEV) return;
  void import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const medir = (metric: { name: string; value: number }) => registrarMedida({ nome: metric.name, valor: `${Math.round(metric.value)} ms`, origem: 'Web Vitals' });
    onCLS(medir); onFCP(medir); onINP(medir); onLCP(medir); onTTFB(medir);
  });
}

export function registrarRender(_id: string, phase: string, actualDuration: number): void {
  if (import.meta.env.DEV) registrarMedida({ nome: `React · ${phase}`, valor: `${actualDuration.toFixed(1)} ms`, origem: 'Render' });
}
