import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = {
  N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800',
  N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800'
};

const BOLINHA = {
  vermelho: { bg: 'bg-red-500',    title: 'Entrega em atraso' },
  laranja:  { bg: 'bg-orange-400', title: 'Próximo do vencimento (≤3 dias)' },
  azul:     { bg: 'bg-blue-400',   title: 'Dentro do prazo' },
};

function Bolinha({ tipo }) {
  if (!tipo) return null;
  const b = BOLINHA[tipo];
  return <span title={b.title} className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${b.bg}`} />;
}

const fmtData = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const Checkbox = ({ checked, onClick, indeterminate }) => (
  <div onClick={onClick}
    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${checked || indeterminate ? 'bg-ink border-ink' : 'border-border2 hover:border-muted'}`}>
    {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
    {indeterminate && !checked && <div className="w-2 h-0.5 bg-white rounded" />}
  </div>
);

export default function Mensal() {
  const { competencia } = useOutletContext();
  const { getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroBolinha, setFiltroBolinha] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState([]);
  const [processandoLote, setProcessandoLote] = useState(false);
  const [modalDispensa, setModalDispensa] = useState(null); // { tipo: 'individual'|'lote', alvo }
  const [justificativaInput, setJustificativaInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [competencia, filtroResponsavel]);

  function carregar() {
    setLoading(true);
    setSelecionadas([]);
    const responsavelId = getResponsavelIdFiltro();
    const params = new URLSearchParams();
    if (responsavelId) params.append('responsavelId', responsavelId);
    api.get(`/mensal/${competencia}?${params}`)
      .then(r => setLinhas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const filtradas = linhas.filter(l => {
    const matchTipo =
      filtroTipo === 'TODAS'         ? true :
      filtroTipo === 'FUNCIONARIOS'  ? l.temFuncionarios :
      filtroTipo === 'PROLABORE'     ? l.temProLabore :
      filtroTipo === 'SO_PROLABORE'  ? (l.temProLabore && !l.temFuncionarios) :
      filtroTipo === 'SEM_MOVIMENTO' ? l.semMovimento : true;

    const matchStatus =
      filtroStatus === 'TODOS'      ? true :
      filtroStatus === 'PENDENTES'  ? !l.concluido :
      filtroStatus === 'CONCLUIDOS' ? l.concluido : true;

    const matchBolinha = filtroBolinha === 'TODOS' || l._bolinha === filtroBolinha;

    const matchBusca = !busca ||
      l.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      l.nomeTarefa.toLowerCase().includes(busca.toLowerCase()) ||
      l.cnpj.includes(busca);

    return matchTipo && matchStatus && matchBolinha && matchBusca;
  });

  const tiposFiltro = [
    { key: 'TODAS',         label: 'Todas' },
    { key: 'FUNCIONARIOS',  label: 'Com funcionários' },
    { key: 'PROLABORE',     label: 'Pró-labore' },
    { key: 'SO_PROLABORE',  label: 'Só pró-labore' },
    { key: 'SEM_MOVIMENTO', label: 'Sem movimento' },
  ];

  const statusFiltro = [
    { key: 'TODOS',      label: 'Todos os status' },
    { key: 'PENDENTES',  label: 'Pendentes' },
    { key: 'CONCLUIDOS', label: 'Concluídos' },
  ];

  const bolinhaFiltro = [
    { key: 'TODOS',    label: 'Todas urgências' },
    { key: 'vermelho', label: '🔴 Em atraso' },
    { key: 'laranja',  label: '🟠 Próximo vencimento' },
    { key: 'azul',     label: '🔵 No prazo' },
  ];

  const emAtraso    = linhas.filter(l => !l.concluido && l._bolinha === 'vermelho').length;
  const proximoVenc = linhas.filter(l => !l.concluido && l._bolinha === 'laranja').length;
  const concluidas  = linhas.filter(l => l.concluido).length;

  function toggleSelecao(id) {
    setSelecionadas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleTodas() {
    const idsPendentes = filtradas.filter(l => !l.concluido).map(l => l.id);
    if (selecionadas.length === idsPendentes.length) setSelecionadas([]);
    else setSelecionadas(idsPendentes);
  }

  // Marca como entregue diretamente (sem abrir a empresa) — uma linha
  async function marcarEntregueRapido(linha) {
    setProcessandoLote(true);
    try {
      await api.post(`/mensal/lote/${competencia}`, {
        itens: [{ empresaId: linha.empresaId, grupoId: linha.grupoId }],
        acao: 'entregar'
      });
      carregar();
    } catch { alert('Erro ao marcar como entregue.'); }
    finally { setProcessandoLote(false); }
  }

  // Abre modal de dispensa (individual)
  function abrirDispensaIndividual(linha) {
    setModalDispensa({ tipo: 'individual', alvo: linha });
    setJustificativaInput('');
  }

  function abrirDispensaLote() {
    if (selecionadas.length === 0) return;
    setModalDispensa({ tipo: 'lote', alvo: null });
    setJustificativaInput('');
  }

  async function confirmarDispensa() {
    setProcessandoLote(true);
    try {
      let itens;
      if (modalDispensa.tipo === 'individual') {
        itens = [{ empresaId: modalDispensa.alvo.empresaId, grupoId: modalDispensa.alvo.grupoId }];
      } else {
        itens = linhas.filter(l => selecionadas.includes(l.id))
          .map(l => ({ empresaId: l.empresaId, grupoId: l.grupoId }));
      }
      await api.post(`/mensal/lote/${competencia}`, {
        itens, acao: 'dispensar', justificativa: justificativaInput.trim() || null
      });
      setModalDispensa(null);
      setJustificativaInput('');
      carregar();
    } catch { alert('Erro ao dispensar.'); }
    finally { setProcessandoLote(false); }
  }

  async function concluirEmLote() {
    if (selecionadas.length === 0) return;
    if (!window.confirm(`Marcar ${selecionadas.length} tarefa(s) como entregue?`)) return;
    setProcessandoLote(true);
    try {
      const itens = linhas.filter(l => selecionadas.includes(l.id))
        .map(l => ({ empresaId: l.empresaId, grupoId: l.grupoId }));
      await api.post(`/mensal/lote/${competencia}`, { itens, acao: 'entregar' });
      carregar();
    } catch { alert('Erro ao concluir em lote.'); }
    finally { setProcessandoLote(false); }
  }

  return (
    <div>
      {/* Modal de justificativa de dispensa */}
      {modalDispensa && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface2">
              <div>
                <p className="text-sm font-semibold text-ink">Dispensar tarefa</p>
                <p className="text-xs text-faint mt-0.5">
                  {modalDispensa.tipo === 'individual'
                    ? `${modalDispensa.alvo.nomeTarefa} — ${modalDispensa.alvo.razaoSocial}`
                    : `${selecionadas.length} tarefa(s) selecionada(s)`}
                </p>
              </div>
              <button onClick={() => setModalDispensa(null)} className="text-faint hover:text-ink">✕</button>
            </div>
            <div className="p-5">
              <label className="label mb-1.5">
                Justificativa <span className="text-faint font-normal">(opcional)</span>
              </label>
              <textarea className="input h-20 resize-none py-2"
                value={justificativaInput}
                onChange={e => setJustificativaInput(e.target.value)}
                placeholder="Ex: empresa sem movimento este mês, cliente solicitou..." />
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={confirmarDispensa} disabled={processandoLote} className="btn btn-primary flex-1 justify-center">
                {processandoLote
                  ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  : 'Confirmar dispensa'}
              </button>
              <button onClick={() => setModalDispensa(null)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {(emAtraso > 0 || proximoVenc > 0 || concluidas > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'vermelho' ? 'TODOS' : 'vermelho')}>
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{emAtraso} em atraso</p>
              <p className="text-[10px] text-faint">entrega vencida</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'laranja' ? 'TODOS' : 'laranja')}>
            <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-700">{proximoVenc} próximo vencimento</p>
              <p className="text-[10px] text-faint">≤ 3 dias para entregar</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">{concluidas} concluídas</p>
              <p className="text-[10px] text-faint">de {linhas.length} no total</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar empresa ou tarefa..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="select w-auto" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          {statusFiltro.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {tiposFiltro.map(f => (
            <button key={f.key} onClick={() => setFiltroTipo(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtroTipo===f.key?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {filtroBolinha !== 'TODOS' && (
          <button onClick={() => setFiltroBolinha('TODOS')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-surface2 text-muted border-border flex items-center gap-1.5">
            <Bolinha tipo={filtroBolinha} />
            {bolinhaFiltro.find(b => b.key === filtroBolinha)?.label}
            <span className="ml-1 text-faint">✕</span>
          </button>
        )}
        <span className="text-xs text-faint ml-auto">{filtradas.length} entrega(s)</span>
      </div>

      {/* Barra de ações em lote */}
      {selecionadas.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-800">{selecionadas.length} selecionada(s)</span>
          <button onClick={concluirEmLote} disabled={processandoLote}
            className="text-xs font-semibold text-green-700 hover:text-green-900 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-100 transition-colors">
            ✓ Marcar entregues
          </button>
          <button onClick={abrirDispensaLote} disabled={processandoLote}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors">
            Dispensar
          </button>
          <button onClick={() => setSelecionadas([])} className="text-xs text-muted hover:text-ink ml-auto">✕ Limpar seleção</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma entrega encontrada.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                <th className="px-4 py-2.5 border-b border-border w-8">
                  <Checkbox
                    checked={filtradas.filter(l => !l.concluido).length > 0 && selecionadas.length === filtradas.filter(l => !l.concluido).length}
                    indeterminate={selecionadas.length > 0 && selecionadas.length < filtradas.filter(l => !l.concluido).length}
                    onClick={toggleTodas} />
                </th>
                {['Empresa', 'Tarefa', 'Prazo', 'Responsável', 'Nível', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(l => (
                <tr key={l.id}
                  className={`border-b border-border last:border-b-0 hover:bg-blue-50/50 transition-colors ${l.concluido ? 'opacity-60' : ''} ${selecionadas.includes(l.id) ? 'bg-blue-50' : ''}`}>

                  <td className="px-4 py-3 w-8">
                    {!l.concluido && (
                      <Checkbox checked={selecionadas.includes(l.id)} onClick={() => toggleSelecao(l.id)} />
                    )}
                  </td>

                  <td className="px-4 py-3 cursor-pointer"
                    onClick={() => navigate(`/mensal/${l.empresaId}`, { state: { competencia, grupoIdFoco: l.grupoId } })}>
                    <p className="text-sm font-semibold text-ink">{l.razaoSocial}</p>
                    <p className="text-xs text-faint font-mono">
                      {l.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                    </p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {l.temFuncionarios && l.temProLabore  && <span className="text-[10px] text-blue-600">Func. + PL</span>}
                      {l.temFuncionarios && !l.temProLabore && <span className="text-[10px] text-blue-600">Funcionários</span>}
                      {!l.temFuncionarios && l.temProLabore && <span className="text-[10px] text-purple-600">Só pró-labore</span>}
                      {l.semMovimento && <span className="text-[10px] text-gray-500">Sem movimento</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3 cursor-pointer"
                    onClick={() => navigate(`/mensal/${l.empresaId}`, { state: { competencia, grupoIdFoco: l.grupoId } })}>
                    <p className="text-sm font-semibold text-ink">{l.nomeTarefa}</p>
                    <p className="text-[10px] text-faint mt-0.5">
                      {l.isDiaUtil ? `${l.diaVencimento}º dia útil` : `Dia ${l.diaVencimento}`}
                      {l.mesSubsequente ? ' · mês seguinte' : ' · mesmo mês'}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!l.concluido && <Bolinha tipo={l._bolinha} />}
                      {l.concluido && <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />}
                      <div>
                        <p className={`text-sm font-semibold ${l.diasRestantes < 0 && !l.concluido ? 'text-red-700' : l.diasRestantes <= 3 && !l.concluido ? 'text-amber-700' : 'text-ink'}`}>
                          {fmtData(l.dataVencReal)}
                        </p>
                        {!l.concluido && (
                          <p className="text-[10px] text-faint">
                            {l.diasRestantes < 0
                              ? `${Math.abs(l.diasRestantes)} dia(s) atraso`
                              : l.diasRestantes === 0 ? 'Vence hoje'
                              : `${l.diasRestantes} dia(s)`}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted">{l.responsavel?.nome || '—'}</td>

                  <td className="px-4 py-3">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[l.nivel]}`}>
                      {l.nivel}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {l.concluido ? (
                      <div>
                        <span className="pill pill-green text-[10px]">
                          {l.dispensada ? 'Dispensada' : '✓ Entregue'}
                        </span>
                        {l.justificativa && (
                          <p className="text-[10px] text-faint mt-1 max-w-[160px] truncate" title={l.justificativa}>
                            "{l.justificativa}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className={`pill text-[10px] ${l._bolinha === 'vermelho' ? 'pill-red' : l._bolinha === 'laranja' ? 'pill-amber' : 'pill-blue'}`}>
                        {l._bolinha === 'vermelho' ? 'Atrasado' : l._bolinha === 'laranja' ? 'Próximo' : 'No prazo'}
                      </span>
                    )}
                  </td>

                  {/* Ações rápidas fora da tarefa */}
                  <td className="px-4 py-3">
                    {!l.concluido && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => marcarEntregueRapido(l)}
                          className="text-xs text-green-600 font-medium hover:underline whitespace-nowrap">
                          ✓ Entregue
                        </button>
                        <span className="text-faint text-xs">·</span>
                        <button onClick={() => abrirDispensaIndividual(l)}
                          className="text-xs text-gray-500 font-medium hover:text-gray-700 hover:underline whitespace-nowrap">
                          Dispensar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
