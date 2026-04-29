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
  const [tarefasExtras, setTarefasExtras] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [adicionandoTarefa, setAdicionandoTarefa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/empresas/${empresaId}`),
      api.get(`/mensal/${competencia}/${empresaId}`),
      api.get(`/tarefas/${empresaId}`)
    ]).then(([e, h, t]) => {
      setEmpresa(e.data);
      setHistorico(h.data);
      setTarefasExtras(t.data);
    });
  }, [empresaId, competencia]);

  function toggle(campo) {
    setHistorico(h => ({ ...h, [campo]: !h[campo] }));
    setSalvo(false);
  }

  function setValor(campo, valor) {
    setHistorico(h => ({ ...h, [campo]: valor }));
    setSalvo(false);
  }

  function toggleTarefaExtra(tarefaId) {
    setHistorico(h => ({
      ...h,
      tarefasOk: h.tarefasOk
        ? h.tarefasOk.map(t => t.tarefaId === tarefaId ? { ...t, ok: !t.ok } : t)
        : [{ tarefaId, ok: true }]
    }));
    setSalvo(false);
  }

  function isTarefaOk(tarefaId) {
    if (!historico?.tarefasOk) return false;
    const t = historico.tarefasOk.find(t => t.tarefaId === tarefaId);
    return t?.ok || false;
  }

  async function adicionarTarefa() {
    if (!novaTarefa.trim()) return;
    setAdicionandoTarefa(true);
    try {
      const { data } = await api.post(`/tarefas/${empresaId}`, { nome: novaTarefa.trim() });
      setTarefasExtras(t => [...t, data]);
      setNovaTarefa('');
    } finally {
      setAdicionandoTarefa(false);
    }
  }

  async function removerTarefa(id) {
    if (!window.confirm('Remover esta tarefa?')) return;
    await api.delete(`/tarefas/${id}`);
    setTarefasExtras(t => t.filter(x => x.id !== id));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const camposPermitidos = [
        'folhaOk','inssOk','fgtsOk','irOk','proLaboreOk','semMovimentoOk',
        'valorInss','valorFgts','valorIr','dataEntregaFolha','dataEntregaObrig','tarefasOk'
      ];
      const dadosFiltrados = Object.fromEntries(
        Object.entries(historico).filter(([k]) => camposPermitidos.includes(k))
      );
      const payload = {
        ...dadosFiltrados,
        tarefasExtrasOk: tarefasExtras.map(t => ({
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

  const camposFuncionarios = [
    { key:'folhaOk', label:'Folha de pagamento' },
    { key:'inssOk', label:'INSS', valorKey:'valorInss' },
    { key:'fgtsOk', label:'FGTS', valorKey:'valorFgts' },
    { key:'irOk', label:'IR (IRRF)', valorKey:'valorIr' },
  ];
  const camposProLabore = [
    { key:'proLaboreOk', label:'Pró-labore' },
    { key:'inssOk', label:'INSS', valorKey:'valorInss' },
    { key:'fgtsOk', label:'FGTS', valorKey:'valorFgts' },
  ];
  const camposSemMov = [
    { key:'semMovimentoOk', label:'Declarado sem movimento' },
  ];

  const campos = empresa.temFuncionarios ? camposFuncionarios
    : empresa.temProLabore ? camposProLabore
    : camposSemMov;

  const totalObrig = campos.length;
  const feitosObrig = campos.filter(c => historico[c.key]).length;
  const totalExtras = tarefasExtras.length;
  const feitosExtras = tarefasExtras.filter(t => isTarefaOk(t.id)).length;
  const total = totalObrig + totalExtras;
  const feitos = feitosObrig + feitosExtras;
  const pct = total ? Math.round((feitos/total)*100) : 0;

  const totalFinanceiro = [historico.valorInss, historico.valorFgts, historico.valorIr]
    .reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

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
              <span className="card-title">Folha de Pagamento — {competencia}</span>
              <span className={`pill ${feitos===total?'pill-green':feitos>0?'pill-amber':'pill-red'}`}>
                {feitos}/{total} {feitos===total?'✓':''}
              </span>
            </div>
            <div>
              {campos.map(c => (
                <div key={c.key} onClick={() => toggle(c.key)}
                  className={`check-item ${historico[c.key]?'done':''}`}>
                  <div className={`check-box ${historico[c.key]?'done':''}`}>
                    {historico[c.key] && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#F4F3EF" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="check-label flex-1 text-sm font-medium">{c.label}</span>
                  {c.valorKey && (
                    <input
                      onClick={e => e.stopPropagation()}
                      className="input w-32 text-xs h-8"
                      placeholder="R$ 0,00"
                      defaultValue={historico[c.valorKey] ? fmtMoeda(historico[c.valorKey]) : ''}
                      onBlur={e => setValor(c.valorKey, parseMoeda(e.target.value))}
                    />
                  )}
                  <span className={`pill ml-2 ${historico[c.key]?'pill-green':'pill-gray'}`}>
                    {historico[c.key]?'OK':'—'}
                  </span>
                </div>
              ))}

              {tarefasExtras.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-surface2 border-t border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wide text-faint">Tarefas extras</span>
                  </div>
                  {tarefasExtras.map(t => (
                    <div key={t.id} onClick={() => toggleTarefaExtra(t.id)}
                      className={`check-item ${isTarefaOk(t.id)?'done':''}`}>
                      <div className={`check-box ${isTarefaOk(t.id)?'done':''}`}>
                        {isTarefaOk(t.id) && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#F4F3EF" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="check-label flex-1 text-sm font-medium">{t.nome}</span>
                      <span className={`pill ml-2 ${isTarefaOk(t.id)?'pill-green':'pill-gray'}`}>
                        {isTarefaOk(t.id)?'OK':'—'}
                      </span>
                      {isGestor && (
                        <button onClick={e => { e.stopPropagation(); removerTarefa(t.id); }}
                          className="ml-2 text-xs text-red-400 hover:text-red-600">✕</button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {isGestor && (
                <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                  <input
                    className="input flex-1 h-8 text-xs"
                    placeholder="+ Adicionar tarefa extra (ex: Relatório de líquidos)"
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

            <div className="px-5 py-3 bg-surface2 border-t border-border flex items-end gap-5">
              <div>
                <label className="label">Entrega da folha</label>
                <input type="date" className="input w-40 h-8 text-xs"
                  value={historico.dataEntregaFolha?.slice(0,10) || ''}
                  onChange={e => setValor('dataEntregaFolha', e.target.value)} />
              </div>
              <div>
                <label className="label">Entrega obrigações</label>
                <input type="date" className="input w-40 h-8 text-xs"
                  value={historico.dataEntregaObrig?.slice(0,10) || ''}
                  onChange={e => setValor('dataEntregaObrig', e.target.value)} />
              </div>
              <button onClick={salvar} disabled={salvando} className="btn btn-primary ml-auto">
                {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  : salvo ? '✓ Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>

          {empresa.observacoes && (
            <div className="card p-4">
              <p className="label mb-2">Observações</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
