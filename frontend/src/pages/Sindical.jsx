import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [controles, setControles] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [empresasComFunc, setEmpresasComFunc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('cct');
  const { isGestor } = useAuth();
  const anoAtual = new Date().getFullYear();

  const [formCCT, setFormCCT] = useState({ empresaId: '', sindicatoId: '', ultimaCct: anoAtual, reajusteAplicado: false });
  const [mostraFormCCT, setMostraFormCCT] = useState(false);
  const [salvandoCCT, setSalvandoCCT] = useState(false);

  const [formSind, setFormSind] = useState({ nome: '', dataBase: '', observacoes: '' });
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [mostraFormSind, setMostraFormSind] = useState(false);
  const [editandoSind, setEditandoSind] = useState(null);
  const [salvandoSind, setSalvandoSind] = useState(false);

  useEffect(() => {
    carregar();
    api.get('/empresas?temFuncionarios=true').then(r => setEmpresasComFunc(r.data));
  }, []);

  function carregar() {
    setLoading(true);
    Promise.all([
      api.get('/sindical'),
      api.get('/sindical/sindicatos')
    ]).then(([c, s]) => {
      setControles(c.data);
      setSindicatos(s.data);
    }).finally(() => setLoading(false));
  }

  async function salvarCCT(e) {
    e.preventDefault();
    setSalvandoCCT(true);
    try {
      await api.put(`/sindical/${formCCT.empresaId}`, {
        sindicatoId: formCCT.sindicatoId,
        ultimaCct: Number(formCCT.ultimaCct),
        reajusteAplicado: formCCT.reajusteAplicado
      });
      setMostraFormCCT(false);
      setFormCCT({ empresaId: '', sindicatoId: '', ultimaCct: anoAtual, reajusteAplicado: false });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvandoCCT(false);
    }
  }

  function editarCCT(c) {
    setFormCCT({
      empresaId: c.empresaId,
      sindicatoId: c.sindicatoId || '',
      ultimaCct: c.ultimaCct,
      reajusteAplicado: c.reajusteAplicado
    });
    setMostraFormCCT(true);
    window.scrollTo(0, 0);
  }

  async function salvarSindicato(e) {
    e.preventDefault();
    setSalvandoSind(true);
    try {
      if (editandoSind) {
        await api.put(`/sindical/sindicatos/${editandoSind}`, { ...formSind, empresasIds: empresasSelecionadas });
      } else {
        await api.post('/sindical/sindicatos', { ...formSind, empresasIds: empresasSelecionadas });
      }
      setMostraFormSind(false);
      setEditandoSind(null);
      setFormSind({ nome: '', dataBase: '', observacoes: '' });
      setEmpresasSelecionadas([]);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvandoSind(false);
    }
  }

  function editarSindicato(s) {
    setEditandoSind(s.id);
    setFormSind({ nome: s.nome, dataBase: s.dataBase, observacoes: s.observacoes || '' });
    const vinculadas = controles.filter(c => c.sindicatoId === s.id).map(c => c.empresaId);
    setEmpresasSelecionadas(vinculadas);
    setMostraFormSind(true);
    window.scrollTo(0, 0);
  }

  async function removerSindicato(id) {
    if (!window.confirm('Remover este sindicato?')) return;
    await api.delete(`/sindical/sindicatos/${id}`);
    carregar();
  }

  function toggleEmpresa(id) {
    setEmpresasSelecionadas(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    );
  }

  const sindicatoSelecionado = sindicatos.find(s => s.id === formCCT.sindicatoId);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Sindical / CCT</h2>
          <p className="text-sm text-muted mt-0.5">Controle de sindicatos e convenções coletivas</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {[['cct', 'Controle CCT'], ['sindicatos', 'Sindicatos']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${aba === id ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'sindicatos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => {
              setMostraFormSind(!mostraFormSind);
              setEditandoSind(null);
              setFormSind({ nome: '', dataBase: '', observacoes: '' });
              setEmpresasSelecionadas([]);
            }} className="btn btn-primary">
              {mostraFormSind ? 'Cancelar' : '+ Novo sindicato'}
            </button>
          </div>

          {mostraFormSind && (
            <form onSubmit={salvarSindicato} className="card p-5 mb-4 max-w-2xl">
              <p className="text-sm font-semibold text-ink mb-4">{editandoSind ? 'Editar sindicato' : 'Novo sindicato'}</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome do sindicato</label>
                    <input className="input" required value={formSind.nome}
                      onChange={e => setFormSind(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Sindicato dos Comerciários MG" />
                  </div>
                  <div>
                    <label className="label">Data-base (dia/mês)</label>
                    <input className="input" required value={formSind.dataBase}
                      onChange={e => setFormSind(f => ({ ...f, dataBase: e.target.value }))}
                      placeholder="Ex: 01/03" />
                  </div>
                </div>
                <div>
                  <label className="label">Observações <span className="text-faint">(opcional)</span></label>
                  <textarea className="input h-16 resize-none py-2" value={formSind.observacoes}
                    onChange={e => setFormSind(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Informações adicionais sobre o sindicato..." />
                </div>
                <div>
                  <label className="label mb-2">
                    Empresas vinculadas
                    <span className="text-faint font-normal ml-1">(apenas empresas com funcionários)</span>
                  </label>
                  {empresasComFunc.length === 0 ? (
                    <p className="text-xs text-faint p-3 bg-surface2 rounded-lg border border-border">
                      Nenhuma empresa com funcionários cadastrada.
                    </p>
                  ) : (
                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                      {empresasComFunc.map(emp => (
                        <label key={emp.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                          <div onClick={() => toggleEmpresa(emp.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${empresasSelecionadas.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                            {empresasSelecionadas.includes(emp.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-ink">{emp.razaoSocial}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {empresasSelecionadas.length > 0 && (
                    <p className="text-xs text-muted mt-1">
                      {empresasSelecionadas.length} empresa(s) selecionada(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={salvandoSind} className="btn btn-primary">
                    {salvandoSind
                      ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                      : editandoSind ? 'Salvar alterações' : 'Cadastrar sindicato'}
                  </button>
                  <button type="button" onClick={() => setMostraFormSind(false)} className="btn btn-secondary">Cancelar</button>
                </div>
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
                    {['Sindicato', 'Data-base', 'Observações', 'Empresas vinculadas', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sindicatos.map(s => {
                    const vinculadas = controles.filter(c => c.sindicatoId === s.id).length;
                    return (
                      <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                        <td className="px-4 py-3 text-sm font-semibold text-ink">{s.nome}</td>
                        <td className="px-4 py-3 text-sm text-muted">{s.dataBase}</td>
                        <td className="px-4 py-3 text-sm text-muted max-w-xs truncate">{s.observacoes || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="pill pill-blue">{vinculadas} empresa{vinculadas !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => editarSindicato(s)} className="text-xs text-blue-600 hover:underline">Editar</button>
                            {isGestor && (
                              <button onClick={() => removerSindicato(s.id)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sindicatos.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-faint">Nenhum sindicato cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'cct' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted">Exibindo apenas empresas com funcionários cadastrados.</p>
            {isGestor && (
              <button onClick={() => {
                setMostraFormCCT(!mostraFormCCT);
                setFormCCT({ empresaId: '', sindicatoId: '', ultimaCct: anoAtual, reajusteAplicado: false });
              }} className="btn btn-primary">
                {mostraFormCCT ? 'Cancelar' : '+ Vincular empresa'}
              </button>
            )}
          </div>

          {mostraFormCCT && (
            <form onSubmit={salvarCCT} className="card p-5 mb-4 max-w-2xl">
              <p className="text-sm font-semibold text-ink mb-4">Vincular sindicato a uma empresa</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Empresa <span className="text-faint font-normal">(com funcionários)</span></label>
                  <select className="select" required value={formCCT.empresaId}
                    onChange={e => setFormCCT(f => ({ ...f, empresaId: e.target.value }))}>
                    <option value="">Selecionar empresa...</option>
                    {empresasComFunc.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Sindicato</label>
                  <select className="select" required value={formCCT.sindicatoId}
                    onChange={e => setFormCCT(f => ({ ...f, sindicatoId: e.target.value }))}>
                    <option value="">Selecionar sindicato...</option>
                    {sindicatos.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  {sindicatoSelecionado && (
                    <p className="text-xs text-muted mt-1">Data-base: <span className="font-medium text-ink">{sindicatoSelecionado.dataBase}</span></p>
                  )}
                </div>
                <div>
                  <label className="label">Última CCT (ano)</label>
                  <input className="input" type="number" value={formCCT.ultimaCct}
                    onChange={e => setFormCCT(f => ({ ...f, ultimaCct: e.target.value }))} />
                </div>
                <div>
                  <div onClick={() => setFormCCT(f => ({ ...f, reajusteAplicado: !f.reajusteAplicado }))}
                    className="flex items-center justify-between p-3 bg-surface2 rounded-lg border border-border cursor-pointer mt-5">
                    <span className="text-sm font-medium text-ink">Reajuste já aplicado?</span>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${formCCT.reajusteAplicado ? 'bg-ink' : 'bg-border2'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${formCCT.reajusteAplicado ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={salvandoCCT} className="btn btn-primary">
                  {salvandoCCT ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Salvar'}
                </button>
                <button type="button" onClick={() => setMostraFormCCT(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
          ) : controles.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-muted text-sm">Nenhuma empresa com funcionários vinculada.</p>
              <p className="text-faint text-xs mt-1">Certifique-se de que a empresa tem "Tem funcionários" marcado no cadastro.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface2">
                  <tr>
                    {['Empresa', 'Sindicato', 'Data-base', 'Última CCT', 'Reajuste', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {controles.map(c => {
                    const ok = c.ultimaCct >= anoAtual;
                    return (
                      <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                        <td className="px-4 py-3 text-sm font-semibold text-ink">{c.empresa?.razaoSocial}</td>
                        <td className="px-4 py-3 text-sm text-muted">{c.sindicato?.nome || '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted">{c.sindicato?.dataBase || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>{c.ultimaCct}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`pill ${c.reajusteAplicado ? 'pill-green' : 'pill-red'}`}>
                            {c.reajusteAplicado ? 'Aplicado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`pill ${ok ? 'pill-green' : 'pill-red'}`}>
                            {ok ? 'CCT Atualizada' : 'CCT Desatualizada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isGestor && (
                            <button onClick={() => editarCCT(c)} className="text-xs text-blue-600 hover:underline">Editar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Sindical;
