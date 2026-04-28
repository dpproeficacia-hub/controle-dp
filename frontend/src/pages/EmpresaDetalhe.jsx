import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

const fmtMoeda = v => v ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '';
const parseMoeda = v => parseFloat(v.replace(/[^\d,]/g,'').replace(',','.')) || null;
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');

export default function EmpresaDetalhe() {
  const { empresaId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const competencia = state?.competencia || new Date().toISOString().slice(0,7);

  const [empresa, setEmpresa] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/empresas/${empresaId}`),
      api.get(`/mensal/${competencia}/${empresaId}`)
    ]).then(([e, h]) => {
      setEmpresa(e.data);
      setHistorico(h.data);
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

  async function salvar() {
    setSalvando(true);
    try {
      const { data } = await api.post(`/mensal/${competencia}/${empresaId}`, historico);
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

  const total = campos.length;
  const feitos = campos.filter(c => historico[c.key]).length;
  const pct = total ? Math.round((feitos/total)*100) : 0;

  const totalFinanceiro = [historico.valorInss, historico.valorFgts, historico.valorIr]
    .reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-faint mb-5">
        <button onClick={() => navigate('/mensal')} className="text-blue-600 hover:underline">Controle Mensal</button>
        <span>›</span>
        <span className="text-ink font-medium">{empresa.razaoSocial}</span>
      </div>

      {/* Cabeçalho da empresa */}
      <div className="card p-5 mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center font-display font-bold text-lg text-bg flex-shrink-0">
            {empresa.razaoSocial.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-ink">{empresa.razaoSocial}</h2>
            <p className="text-xs text-faint mt-0.5">{fmtCNPJ(empresa.cnpj)} · {empresa.enquadramento.replace('_',' ')} · {empresa.tipo}</p>
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
          {/* Checklist */}
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
            </div>
            {/* Datas e salvar */}
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

          {/* Observações */}
          {empresa.observacoes && (
            <div className="card p-4">
              <p className="label mb-2">Observações</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
                {empresa.observacoes}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Status */}
          <div className="card p-4 text-center">
            <p className="font-display font-bold text-4xl" style={{color: pct===100?'#3B6D11':pct>0?'#854F0B':'#A32D2D'}}>{pct}%</p>
            <p className="text-xs text-faint mt-1">
              {pct===100?'Finalizado':pct>0?'Em andamento':'Não iniciado'}
            </p>
            <div className="progress-bar mt-3">
              <div className="progress-fill" style={{ width:`${pct}%`, background: pct===100?'#3B6D11':pct>0?'#854F0B':'#A32D2D' }} />
            </div>
            {pct < 100 && (
              <p className="text-xs text-faint mt-2">
                Falta: {campos.filter(c => !historico[c.key]).map(c=>c.label).join(', ')}
              </p>
            )}
          </div>

          {/* Resumo financeiro */}
          <div className="card">
            <div className="card-header"><span className="card-title">Resumo Financeiro</span></div>
            <div className="p-4 space-y-2.5">
              {[['INSS','valorInss'],['FGTS','valorFgts'],['IR','valorIr']].map(([l,k]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted">{l}</span>
                  <span className="font-semibold">{historico[k] ? fmtMoeda(historico[k]) : '—'}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2.5 flex justify-between text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-green-700">{totalFinanceiro > 0 ? fmtMoeda(totalFinanceiro) : '—'}</span>
              </div>
            </div>
          </div>

          {/* CCT */}
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
                    <span className="font-medium">{v}</span>
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
