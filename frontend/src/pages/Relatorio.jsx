import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Relatorio() {
  const { competencia } = useOutletContext();
  const [abaAtiva, setAbaAtiva] = useState('envios');
  const [impDe, setImpDe] = useState('');
  const [impAte, setImpAte] = useState('');
  const [gerandoEnvios, setGerandoEnvios] = useState(false);
  const [gerandoImp, setGerandoImp] = useState(false);

  function abrirRelatorio(url) {
    const token = localStorage.getItem('dp_token');
    const sep = url.includes('?') ? '&' : '?';
    window.open(`${import.meta.env.VITE_API_URL || 'https://controle-dp-backend.onrender.com/api'}${url}${sep}_token=${token}`, '_blank');
  }

  async function gerarEnvios() {
    setGerandoEnvios(true);
    try {
      const token = localStorage.getItem('dp_token');
      const base = import.meta.env.VITE_API_URL || 'https://controle-dp-backend.onrender.com/api';
      const resp = await fetch(`${base}/relatorio/envios/${competencia}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const html = await resp.text();
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    } finally {
      setGerandoEnvios(false);
    }
  }

  async function gerarImpostos() {
    setGerandoImp(true);
    try {
      const token = localStorage.getItem('dp_token');
      const base = import.meta.env.VITE_API_URL || 'https://controle-dp-backend.onrender.com/api';
      const params = new URLSearchParams();
      if (impDe) params.append('de', impDe);
      if (impAte) params.append('ate', impAte);
      const resp = await fetch(`${base}/relatorio/impostos?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const html = await resp.text();
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    } finally {
      setGerandoImp(false);
    }
  }

  const [ano, mes] = competencia.split('-');
  const nomeMes = MESES[parseInt(mes) - 1];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">Relatórios</h1>
        <p className="text-muted text-sm mt-1">Gere relatórios para impressão ou envio</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { key: 'envios', label: '📋 Envios do mês' },
          { key: 'impostos', label: '💰 Impostos por período' },
        ].map(a => (
          <button key={a.key} onClick={() => setAbaAtiva(a.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
              abaAtiva === a.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'envios' && (
        <div className="card p-6 max-w-xl">
          <h2 className="font-semibold text-ink mb-1">Relatório de Envios</h2>
          <p className="text-sm text-muted mb-6">Lista todas as empresas finalizadas da competência selecionada, com data de entrega e responsável.</p>
          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <p className="text-xs text-faint mb-1">Competência atual</p>
            <p className="font-display font-bold text-xl text-ink">{nomeMes} / {ano}</p>
            <p className="text-xs text-faint mt-1">Use o seletor de mês no topo para mudar a competência</p>
          </div>
          <button onClick={gerarEnvios} disabled={gerandoEnvios}
            className="btn btn-primary w-full justify-center">
            {gerandoEnvios
              ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Gerando...</>
              : '🖨 Gerar relatório de envios'}
          </button>
        </div>
      )}

      {abaAtiva === 'impostos' && (
        <div className="card p-6 max-w-xl">
          <h2 className="font-semibold text-ink mb-1">Relatório de Impostos</h2>
          <p className="text-sm text-muted mb-6">Totaliza INSS, FGTS e IR por empresa em um período específico ou todo o histórico.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">De (competência)</label>
              <input type="month" className="input" value={impDe} onChange={e => setImpDe(e.target.value)}
                placeholder="Ex: 2026-01" />
            </div>
            <div>
              <label className="label">Até (competência)</label>
              <input type="month" className="input" value={impAte} onChange={e => setImpAte(e.target.value)}
                placeholder="Ex: 2026-12" />
            </div>
          </div>
          <p className="text-xs text-faint mb-4">
            {!impDe && !impAte ? '⚠ Sem filtro de período: exibirá todo o histórico.' : `Período: ${impDe || 'início'} até ${impAte || 'hoje'}`}
          </p>
          <button onClick={gerarImpostos} disabled={gerandoImp}
            className="btn btn-primary w-full justify-center">
            {gerandoImp
              ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Gerando...</>
              : '🖨 Gerar relatório de impostos'}
          </button>
        </div>
      )}
    </div>
  );
}
