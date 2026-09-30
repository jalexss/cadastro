import React, { Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { observarWebVitals, registrarRender } from './desempenho';
import './styles.css';
import './responsivo.css';

observarWebVitals();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Profiler id="aplicacao" onRender={registrarRender}>
      <BrowserRouter><App /></BrowserRouter>
    </Profiler>
  </React.StrictMode>
);
