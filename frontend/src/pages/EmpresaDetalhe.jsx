import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmtMoeda = v => v ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '';
const parseMoeda = v => parseFloat(v.replace(/[^\d,]/g,'').replace(',','.')) || null;
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');

export default function EmpresaDetalhe() {
  const { empresaId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isGestor } = useAuth();
  const competencia = state?.competencia || new Date().toISOString().slice(0,7);

  const [empresa, setEmpresa] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [adicionandoTarefa, setAdicionandoTarefa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [semMovimentoMes, setSemMovimentoMes] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/empresas/${empresaId}`),
      api.get(`/mensal/${competencia}/${empresaId}`),
      api.get(`/tarefas/${empresaId}`)
    ]).then(([e, h, t]) => {
      setEmpresa(e.data);
      setHistorico(h.data);
      setTarefas(t.data);
      if (e.data.temProLabore && !e.data.temFuncionarios && h.data.semMovimentoMes) {
        setSemMovimentoMes(true);
      }
    });
  }, [empresaId, competencia]);

  function isTarefaOk(tarefaId) {
    if (!historico?.tarefasOk) return false;
    const t = historico.tarefasOk.find(t => t.tarefaId === tarefaId);
    return t?.ok || false;
  }

  function toggleTarefa(tarefaId) {
    setHistorico(h => ({
      ...h,
      tarefasOk: h.tarefasOk
        ? h.tarefasOk.some(t => t.tarefaId === tarefaId)
          ? h.tarefasOk.map(t => t.tarefaId === tarefaId ? { ...t, ok: !t.ok } : t)
          : [...h.tarefasOk, { tarefaId, ok: true }]
        : [{ tarefaId, ok: true }]
    }));
    setSalvo(false);
  }

  function setValor(campo, valor) {
    setHistorico(h => ({ ...h, [campo]: valor }));
    setSalvo(false);
  }

  function toggleSemMovimentoMes(val) {
    setSemMovimentoMes(val);
    setSalvo(false);
  }

  async function adicionarTarefa() {
    if (!novaTarefa.trim()) return;
    setAdicionandoTarefa(true);
    try {
      const { data } = await api.post(`/tarefas/${empresaId}`, { nome: novaTarefa.trim() });
      setTarefas(t => [...t, data]);
      setNovaTarefa('');
    } finally {
      setAdicionandoTarefa(false);
    }
  }

  async function removerTarefa(id) {
    if (!window.confirm('Remover esta tarefa?')) return;
    await api.delete(`/tarefas/${id}`);
    setTarefas(t => t.filter(x => x.id !== id));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        semMovimentoMes,
        dataEntregaFolha: historico.dataEntregaFolha?.slice?.(0,10) || historico.dataEntregaFolha || null,
        dataEntregaObrig: historico.dataEntregaObrig?.slice?.(0,10) || historico.dataEntregaObrig || null,
        valorInss: historico.valorInss,
        valorFgts: historico.valorFgts,
        valorIr: historico.valorIr,
        tarefasExtrasOk: tarefas.map(t => ({
          tarefaId: t.id,
          ok: isTarefaOk(t.id)
        }))
      };
      const { data } = await api.post(`/mensal/${competencia}/${empresaId}`, payload);
      setHistorico(data);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (e) {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  if (!empresa || !historico) return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
  );

  const tarefasAplicaveis = semMovimentoMes
    ? tarefas.filter(t => t.paraSemMovimento || t.paraTodas || !t.global)
    : tarefas;

  const total = tarefasAplicaveis.length;
  const feitos = tarefasAplicaveis.filter(t => isTarefaOk(t.id)).length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;

  const totalFinanceiro = [historico.valorInss, historico.valorFgts, historico.valorIr]
    .reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

  const ehProLabore = empresa.temProLabore && !empresa.temFuncionarios;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-faint mb-5">
        <button onClick={() => navigate('/mensal')} className="text-blue-600 hover:underline">Controle Mensal</button>
        <span>›</span>
        <span className="text-ink font-medium">{empresa.razaoSocial}</span>
      </div>

      <div className="card p-5 mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center font-display font-bold text-lg text-bg flex-shrink-0">
            {empresa.razaoSocial.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-ink">{empresa.razaoSocial}</h2>
            <p className="text-xs text-faint mt-0.5">{fmtCNPJ(empresa.cnpj)} · {empresa.enquadramento.replace(/_/g,' ')} · {empresa.tipo}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {empresa.temFuncionarios && <span className="pill pill-green">Com funcionários</span>}
              {empresa.temProLabore && <span className="pill pill-blue">Pró-labore</span>}
              {empresa.semMovimento && <span className="pill pill-gray">Sem movimento</span>}
              {semMovimentoMes && <span className="pill pill-amber">Sem movimento este mês</span>}
              {empresa.enviaReinf && <span className="pill pill-purple">REINF</span>}
              {empresa.fatorR && <span className="pill pill-teal">Fator R</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
            empresa.nivel==='N1'?'bg-ink text-bg':empresa.nivel==='N2'?'bg-red-100 text-red-800':empresa.nivel==='N3'?'bg-amber-100 text-amber-800':empresa.nivel==='N4'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'
          }`}>{empresa.nivel}</div>
          <button onClick={() => navigate(`/empresas/${empresa.id}/editar`)} className="btn btn-secondary text-xs">Editar cadastro</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">Controle Mensal — {competencia}</span>
              <div className="flex items-center gap-3">
                {ehProLabore && (
                  <button
                    onClick={() => toggleSemMovimentoMes(!semMovimentoMes)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      semMovimentoMes
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-surface text-muted border-border hover:border-border2'
                    }`}>
                    {semMovimentoMes ? '⚠ Sem movimento este mês' : 'Enviar sem movimento?'}
                  </button>
                )}
                <span className={`pill ${feitos===total && total>0 ?'pill-green':feitos>0?'pill-amber':'pill-red'}`}>
                  {feitos}/{total} {feitos===total && total>0 ?'✓':''}
                </span>
              </div>
            </div>

            <div>
              {tarefasAplicaveis.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-faint">
                  Nenhuma tarefa cadastrada para este tipo de empresa.
                  <br />
                  <span className="text-xs">Acesse <strong>Tarefas Extras</strong> no menu para cadastrar.</span>
                </div>
              ) : (
                tarefasAplicaveis.map(t => {
                  const ok = isTarefaOk(t.id);
                  return (
                    <div key={t.id} onClick={() => toggleTarefa(t.id)}
                      className={`check-item ${ok ? 'done' : ''}`}>
                      <div className={`check-box ${ok ? 'done' : ''}`}>
                        {ok && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#F4F3EF" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="check-label flex-1 text-sm font-medium">{t.nome}</span>
                      {t.prazoEntregaDia && (
                        <span className="text-xs text-faint mr-2">Prazo: dia {t.prazoEntregaDia}</span>
                      )}
                      <span className={`pill ml-2 ${ok ? 'pill-green' : 'pill-gray'}`}>
                        {ok ? 'OK' : '—'}
                      </span>
                      {!t.global && isGestor && (
                        <button onClick={e => { e.stopPropagation(); removerTarefa(t.id); }}
                          className="ml-2 text-xs text-red-400 hover:text-red-600">✕</button>
                      )}
                    </div>
                  );
                })
              )}

              {isGestor && (
                <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                  <input
                    className="input flex-1 h-8 text-xs"
                    placeholder="+ Adicionar tarefa específica para esta empresa..."
                    value={novaTarefa}
                    onChange={e => setNovaTarefa(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && adicionarTarefa()}
                  />
                  <button onClick={adicionarTarefa} disabled={adicionandoTarefa || !novaTarefa.trim()}
                    className="btn btn-secondary text-xs h-8 px-3">
                    {adicionandoTarefa ? '...' : 'Adicionar'}
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-surface2 border-t border-border flex items-end gap-5 flex-wrap">
              <div>
                <label className="label">Entrega da folha</label>
                <input type="date" className="input w-40 h-8 text-xs"
                  value={historico.dataEntregaFolha?.slice?.(0,10) || ''}
                  onChange={e => setValor('dataEntregaFolha', e.target.value)} />
              </div>
              <div>
                <label className="label">Entrega obrigações</label>
                <input type="date" className="input w-40 h-8 text-xs"
                  value={historico.dataEntregaObrig?.slice?.(0,10) || ''}
                  onChange={e => setValor('dataEntregaObrig', e.target.value)} />
              </div>
              <button onClick={salvar} disabled={salvando} className="btn btn-primary ml-auto">
                {salvando
                  ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  : salvo ? '✓ Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>

          {empresa.observacoes && (
            <div className="card p-4">
              <p className="label mb-2">Observações</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
                {empresa.observacoes}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-4 text-center">
            <p className="font-display font-bold text-4xl" style={{color: pct===100?'#3B6D11':pct>0?'#854F0B':'#A32D2D'}}>{pct}%</p>
            <p className="text-xs text-faint mt-1">
              {pct===100?'Finalizado':pct>0?'Em andamento':'Não iniciado'}
            </p>
            <div className="progress-bar mt-3">
              <div className="progress-fill" style={{ width:`${pct}%`, background: pct===100?'#3B6D11':pct>0?'#854F0B':'#A32D2D' }} />
            </div>
            {pct < 100 && (
              <p className="text-xs text-faint mt-2">{feitos}/{total} tarefas concluídas</p>
            )}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Resumo Financeiro</span></div>
            <div className="p-4 space-y-2.5">
              {[['INSS','valorInss'],['FGTS','valorFgts'],['IR','valorIr']].map(([l,k]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted">{l}</span>
                  <input
                    className="input w-28 text-xs h-7 text-right"
                    placeholder="R$ 0,00"
                    defaultValue={historico[k] ? fmtMoeda(historico[k]) : ''}
                    onBlur={e => setValor(k, parseMoeda(e.target.value))}
                  />
                </div>
              ))}
              <div className="border-t border-border pt-2.5 flex justify-between text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-green-700">{totalFinanceiro > 0 ? fmtMoeda(totalFinanceiro) : '—'}</span>
              </div>
            </div>
          </div>

          {empresa.sindical && (
            <div className="card">
              <div className="card-header"><span className="card-title">Controle Sindical</span></div>
              <div className="p-4 space-y-2">
                {[
                  ['Sindicato', empresa.sindical.sindicato],
                  ['Data-base', empresa.sindical.dataBase],
                  ['Última CCT', empresa.sindical.ultimaCct],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="text-faint">{l}</span>
                    <span className="font-medium text-right max-w-[160px]">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs">
                  <span className="text-faint">Status CCT</span>
                  <span className={`pill text-[10px] ${empresa.sindical.ultimaCct >= new Date().getFullYear() ? 'pill-green' : 'pill-red'}`}>
                    {empresa.sindical.ultimaCct >= new Date().getFullYear() ? 'Atualizada' : 'Desatualizada'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-faint">Reajuste</span>
                  <span className={`pill text-[10px] ${empresa.sindical.reajusteAplicado ? 'pill-green' : 'pill-red'}`}>
                    {empresa.sindical.reajusteAplicado ? 'Aplicado' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
