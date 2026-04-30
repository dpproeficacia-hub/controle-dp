import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isGestor } = useAuth();
  const anoAtual = new Date().getFullYear();
  const [form, setForm] = useState({ empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false, observacoes:'' });
  const [empresas, setEmpresas] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editandoObs, setEditandoObs] = useState(null);
  const [obsTexto, setObsTexto] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);

  useEffect(() => {
    carregar();
    api.get('/empresas').then(r => setEmpresas(r.data));
  }, []);

  function carregar() {
    setLoading(true);
    api.get('/sindical').then(r => setRegistros(r.data)).finally(() => setLoading(false));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.put(`/sindical/${form.empresaId}`, {
        sindicato: form.sindicato, dataBase: form.dataBase,
        ultimaCct: Number(form.ultimaCct), reajusteAplicado: form.reajusteAplicado,
        observacoes: form.observacoes
      });
      setMostraForm(false);
      setForm({ empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false, observacoes:'' });
      carregar();
    } catch(err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function editar(r) {
    setForm({ empresaId: r.empresaId, sindicato: r.sindicato, dataBase: r.dataBase, ultimaCct: r.ultimaCct, reajusteAplicado: r.reajusteAplicado, observacoes: r.observacoes || '' });
    setMostraForm(true);
    window.scrollTo(0,0);
  }

  async function salvarObs(r) {
    setSalvandoObs(true);
    try {
      await api.put(`/sindical/${r.empresaId}`, {
        sindicato: r.sindicato, dataBase: r.dataBase,
        ultimaCct: r.ultimaCct, reajusteAplicado: r.reajusteAplicado,
        observacoes: obsTexto
      });
      setEditandoObs(null);
      carregar();
    } finally {
      setSalvandoObs(false);
    }
  }

  function gerarRelatorio(r) {
    const token = localStorage.getItem('dp_token');
    const html = `
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#222;max-width:800px;margin:0 auto}
        h1{font-size:22px;color:#1C1B19;margin-bottom:4px}
        .sub{color:#888;font-size:12px;margin-bottom:24px}
        .empresa{font-size:16px;font-weight:700;margin-bottom:4px}
        .cnpj{font-family:monospace;color:#666;font-size:11px}
        .secao{margin-top:24px}
        .secao h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:12px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
        .item{background:#f5f5f5;border-radius:6px;padding:10px}
        .item label{font-size:10px;color:#888;display:block;margin-bottom:2px}
        .item span{font-size:13px;font-weight:600}
        .pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600}
        .green{background:#dcfce7;color:#166534}
        .red{background:#fee2e2;color:#991b1b}
        .obs{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;white-space:pre-wrap;line-height:1.7;font-size:12px}
        .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center}
      </style></head>
      <body>
        <h1>Parecer Sindical — ${r.sindicato}</h1>
        <div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo sistema DPSmart</div>
        <div class="empresa">${r.empresa?.razaoSocial}</div>
        <div class="secao">
          <h2>Informações da CCT</h2>
          <div class="grid">
            <div class="item"><label>Sindicato</label><span>${r.sindicato}</span></div>
            <div class="item"><label>Data-base</label><span>${r.dataBase}</span></div>
            <div class="item"><label>Última CCT</label><span>${r.ultimaCct}</span></div>
            <div class="item"><label>Status</label><span class="pill ${r.ultimaCct >= anoAtual ? 'green' : 'red'}">${r.ultimaCct >= anoAtual ? 'Atualizada' : 'Desatualizada'}</span></div>
            <div class="item"><label>Reajuste</label><span class="pill ${r.reajusteAplicado ? 'green' : 'red'}">${r.reajusteAplicado ? 'Aplicado' : 'Pendente'}</span></div>
          </div>
        </div>
        ${r.observacoes ? `
        <div class="secao">
          <h2>Principais pontos da Convenção Coletiva ${r.ultimaCct}</h2>
          <div class="obs">${r.observacoes}</div>
        </div>` : ''}
        <div class="footer">Documento gerado pelo sistema DPSmart — Departamento Pessoal</div>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Controle Sindical / CCT</h2>
          <p className="text-sm text-muted mt-0.5">Monitoramento de convenções coletivas e datas-base</p>
        </div>
        {isGestor && (
          <button onClick={() => { setMostraForm(!mostraForm); setForm({ empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false, observacoes:'' }); }}
            className="btn btn-primary">
            {mostraForm ? 'Cancelar' : '+ Vincular sindicato'}
          </button>
        )}
      </div>

      {mostraForm && (
        <form onSubmit={salvar} className="card p-5 mb-4 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">Vincular sindicato a uma empresa</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Empresa</label>
              <select className="select" required value={form.empresaId} onChange={e => setForm(f=>({...f,empresaId:e.target.value}))}>
                <option value="">Selecionar empresa...</option>
                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Nome do sindicato</label>
              <input className="input" required value={form.sindicato} onChange={e => setForm(f=>({...f,sindicato:e.target.value}))} placeholder="Ex: Sindicato dos Comerciários MG" />
            </div>
            <div>
              <label className="label">Data-base (dia/mês)</label>
              <input className="input" required value={form.dataBase} onChange={e => setForm(f=>({...f,dataBase:e.target.value}))} placeholder="Ex: 01/03" />
            </div>
            <div>
              <label className="label">Última CCT (ano)</label>
              <input className="input" type="number" required value={form.ultimaCct} onChange={e => setForm(f=>({...f,ultimaCct:e.target.value}))} />
            </div>
            <div className="col-span-2">
              <div onClick={() => setForm(f=>({...f,reajusteAplicado:!f.reajusteAplicado}))}
                className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors">
                <span className="text-sm font-medium text-ink">Reajuste já aplicado?</span>
                <div className={`w-9 h-5 rounded-full relative transition-colors ${form.reajusteAplicado?'bg-ink':'bg-border2'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form.reajusteAplicado?'translate-x-4':'translate-x-0.5'}`} style={{boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Observações / Pontos da CCT</label>
              <textarea className="input" rows={5} value={form.observacoes}
                onChange={e => setForm(f=>({...f,observacoes:e.target.value}))}
                placeholder="Ex: Reajuste salarial de 5% a partir de março/2026&#10;Adicional de insalubridade: 20% sobre o salário mínimo&#10;Banco de horas permitido até 6 meses..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Salvar'}
            </button>
            <button type="button" onClick={() => setMostraForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Empresa','Sindicato','Data-base','Última CCT','Reajuste','Status',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map(r => {
                const ok = r.ultimaCct >= anoAtual;
                const aberto = expandido === r.id;
                return (
                  <>
                    <tr key={r.id} className="border-b border-border hover:bg-surface2">
                      <td className="px-4 py-3 text-sm font-semibold text-ink">{r.empresa?.razaoSocial}</td>
                      <td className="px-4 py-3 text-sm text-muted">{r.sindicato}</td>
                      <td className="px-4 py-3 text-sm text-muted">{r.dataBase}</td>
                      <td className="px-4 py-3"><span className={`text-sm font-bold ${ok?'text-green-700':'text-red-700'}`}>{r.ultimaCct}</span></td>
                      <td className="px-4 py-3"><span className={`pill ${r.reajusteAplicado?'pill-green':'pill-red'}`}>{r.reajusteAplicado?'Aplicado':'Pendente'}</span></td>
                      <td className="px-4 py-3"><span className={`pill ${ok?'pill-green':'pill-red'}`}>{ok?'CCT Atualizada':'CCT Desatualizada'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => setExpandido(aberto ? null : r.id)}
                            className="text-xs text-blue-600 hover:underline">
                            {aberto ? 'Fechar' : 'Observações'}
                          </button>
                          <button onClick={() => gerarRelatorio(r)} className="text-xs text-green-600 hover:underline">Parecer PDF</button>
                          {isGestor && <button onClick={() => editar(r)} className="text-xs text-blue-600 hover:underline">Editar</button>}
                        </div>
                      </td>
                    </tr>
                    {aberto && (
                      <tr key={`obs-${r.id}`} className="border-b border-border bg-surface2">
                        <td colSpan={7} className="px-6 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-2">Principais pontos da CCT {r.ultimaCct}</p>
                          {editandoObs === r.id ? (
                            <div>
                              <textarea className="input w-full text-sm" rows={6} value={obsTexto}
                                onChange={e => setObsTexto(e.target.value)}
                                placeholder="Digite os principais pontos da convenção coletiva..." />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => salvarObs(r)} disabled={salvandoObs} className="btn btn-primary text-xs">
                                  {salvandoObs ? '...' : 'Salvar observações'}
                                </button>
                                <button onClick={() => setEditandoObs(null)} className="btn btn-secondary text-xs">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {r.observacoes ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                                  {r.observacoes}
                                </div>
                              ) : (
                                <p className="text-sm text-faint italic">Nenhuma observação cadastrada.</p>
                              )}
                              {isGestor && (
                                <button onClick={() => { setEditandoObs(r.id); setObsTexto(r.observacoes || ''); }}
                                  className="mt-2 text-xs text-blue-600 hover:underline">
                                  {r.observacoes ? 'Editar observações' : '+ Adicionar observações'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {!registros.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-faint">Nenhum sindicato cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Responsaveis() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    api.get('/responsaveis').then(r => setUsuarios(r.data)).finally(() => setLoading(false));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data } = await api.post('/responsaveis', form);
      setUsuarios(u => [...u, data]);
      setForm({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
      setMostraForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSalvando(false);
    }
  }

  const NIVEL_PILL = { ADMIN:'pill-purple', GESTOR:'pill-blue', OPERADOR:'pill-gray' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-ink">Responsáveis / Usuários</h2>
        {isAdmin && <button onClick={() => setMostraForm(!mostraForm)} className="btn btn-primary">+ Novo usuário</button>}
      </div>
      {mostraForm && (
        <form onSubmit={salvar} className="card p-5 mb-4 grid grid-cols-2 gap-4 max-w-xl">
          <div><label className="label">Nome</label><input className="input" required value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} /></div>
          <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
          <div><label className="label">Senha inicial</label><input className="input" type="password" required value={form.senha} onChange={e => setForm(f=>({...f,senha:e.target.value}))} /></div>
          <div>
            <label className="label">Nível de acesso</label>
            <select className="select" value={form.nivel} onChange={e => setForm(f=>({...f,nivel:e.target.value}))}>
              <option value="OPERADOR">Operador DP</option>
              <option value="GESTOR">Gestor do setor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => setMostraForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>{['Usuário','Email','Nível de acesso','Criado em'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-semibold text-purple-700">
                        {u.nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-ink">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{u.email}</td>
                  <td className="px-4 py-3"><span className={`pill ${NIVEL_PILL[u.nivel]}`}>{u.nivel}</span></td>
                  <td className="px-4 py-3 text-sm text-muted">{new Date(u.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Sindical;
