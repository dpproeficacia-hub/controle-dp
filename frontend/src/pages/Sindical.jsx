import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [controles, setControles] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('cct');
  const { isGestor } = useAuth();
  const anoAtual = new Date().getFullYear();

  // form CCT
  const [formCCT, setFormCCT] = useState({ empresaId:'', sindicatoId:'', ultimaCct: anoAtual, reajusteAplicado: false });
  const [empresas, setEmpresas] = useState([]);
  const [mostraFormCCT, setMostraFormCCT] = useState(false);
  const [salvandoCCT, setSalvandoCCT] = useState(false);

  // form sindicato
  const [formSind, setFormSind] = useState({ nome:'', dataBase:'', observacoes:'' });
  const [mostraFormSind, setMostraFormSind] = useState(false);
  const [editandoSind, setEditandoSind] = useState(null);
  const [salvandoSind, setSalvandoSind] = useState(false);

  useEffect(() => {
    carregar();
    api.get('/empresas').then(r => setEmpresas(r.data));
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
      setFormCCT({ empresaId:'', sindicatoId:'', ultimaCct: anoAtual, reajusteAplicado: false });
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
        await api.put(`/sindical/sindicatos/${editandoSind}`, formSind);
      } else {
        await api.post('/sindical/sindicatos', formSind);
      }
      setMostraFormSind(false);
      setEditandoSind(null);
      setFormSind({ nome:'', dataBase:'', observacoes:'' });
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
    setMostraFormSind(true);
    window.scrollTo(0, 0);
  }

  async function removerSindicato(id) {
    if (!window.confirm('Remover este sindicato?')) return;
    await api.delete(`/sindical/sindicatos/${id}`);
    carregar();
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

      {/* Abas */}
      <div className="flex gap-2 mb-5">
        {[['cct','Controle CCT'],['sindicatos','Sindicatos']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${aba===id?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA SINDICATOS */}
      {aba === 'sindicatos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setMostraFormSind(!mostraFormSind); setEditandoSind(null); setFormSind({ nome:'', dataBase:'', observacoes:'' }); }}
              className="btn btn-primary">
              {mostraFormSind ? 'Cancelar' : '+ Novo sindicato'}
            </button>
          </div>

          {mostraFormSind && (
            <form onSubmit={salvarSindicato} className="card p-5 mb-4 max-w-xl">
              <p className="text-sm font-semibold text-ink mb-4">{editandoSind ? 'Editar sindicato' : 'Novo sindicato'}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Nome do sindicato</label>
                  <input className="input" required value={formSind.nome}
                    onChange={e => setFormSind(f=>({...f,nome:e.target.value}))}
                    placeholder="Ex: Sindicato dos Comerciários MG" />
                </div>
                <div>
                  <label className="label">Data-base (dia/mês)</label>
                  <input className="input" required value={formSind.dataBase}
                    onChange={e => setFormSind(f=>({...f,dataBase:e.target.value}))}
                    placeholder="Ex: 01/03" />
                </div>
                <div>
                  <label className="label">Observações <span className="text-faint">(opcional)</span></label>
                  <textarea className="input h-16 resize-none py-2" value={formSind.observacoes}
                    onChange={e => setFormSind(f=>({...f,observacoes:e.target.value}))}
                    placeholder="Informações adicionais sobre o sindicato..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={salvandoSind} className="btn btn-primary">
                    {salvandoSind ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : editandoSind ? 'Salvar alterações' : 'Cadastrar sindicato'}
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
                    {['Sindicato','Data-base','Observações','Empresas vinculadas',''].map(h => (
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
                          <span
