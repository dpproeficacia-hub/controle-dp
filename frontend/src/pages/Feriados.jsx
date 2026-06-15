import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const MESES_LABEL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const FERIADOS_NACIONAIS = [
  { dia: 1,  mes: 1,  nome: 'Ano Novo' },
  { dia: 21, mes: 4,  nome: 'Tiradentes' },
  { dia: 1,  mes: 5,  nome: 'Dia do Trabalho' },
  { dia: 7,  mes: 9,  nome: 'Independência do Brasil' },
  { dia: 12, mes: 10, nome: 'Nossa Sra. Aparecida' },
  { dia: 2,  mes: 11, nome: 'Finados' },
  { dia: 15, mes: 11, nome: 'Proclamação da República' },
  { dia: 25, mes: 12, nome: 'Natal' },
  { dia: null, mes: null, nome: 'Sexta-feira Santa — calculada automaticamente' },
  { dia: null, mes: null, nome: 'Corpus Christi — calculado automaticamente' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const formVazio = { nome: '', dia: '', mes: '', cidade: '', estado: '' };

export default function Feriados() {
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(formVazio);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);
  const [mostraNacionais, setMostraNacionais] = useState(false);
  const { isGestor } = useAuth();

  useEffect(() => { carregar(); }, []);

  function carregar() {
    setLoading(true);
    api.get('/feriados').then(r => setFeriados(r.data)).finally(() => setLoading(false));
  }

  function cancelar() {
    setEditandoId(null);
    setForm(formVazio);
    setMostraForm(false);
  }

  function iniciarEdicao(f) {
    setEditandoId(f.id);
    setForm({
      nome: f.nome,
      dia: f.dia,
      mes: f.mes,
      cidade: f.cidade || '',
      estado: f.estado || '',
    });
    setMostraForm(true);
    window.scrollTo(0, 0);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editandoId) {
        await api.put(`/feriados/${editandoId}`, form);
      } else {
        await api.post('/feriados', form);
      }
      cancelar();
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar feriado');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id, nome) {
    if (!window.confirm(`Remover o feriado "${nome}"?`)) return;
    await api.delete(`/feriados/${id}`);
    carregar();
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const porCidade = feriados.reduce((acc, f) => {
    const key = f.cidade && f.estado
      ? `${f.cidade} - ${f.estado}`
      : f.estado
      ? `Estado: ${f.estado}`
      : 'Todos (escritório)';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Feriados Municipais</h2>
          <p className="text-sm text-muted mt-0.5">Cadastre feriados por cidade para cálculo correto de dias úteis</p>
        </div>
        {isGestor && (
          <button onClick={() => { cancelar(); setMostraForm(!mostraForm); }} className="btn btn-primary">
            {mostraForm && !editandoId ? 'Cancelar' : '+ Novo feriado'}
          </button>
        )}
      </div>

      {mostraForm && isGestor && (
        <form onSubmit={salvar} className="card p-5 mb-6 max-w-xl">
          <p className="text-sm font-semibold text-ink mb-4">
            {editandoId ? 'Editar feriado' : 'Novo feriado municipal'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Nome do feriado</label>
              <input className="input" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Aniversário de Divinópolis" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dia</label>
                <input className="input" type="number" min="1" max="31" required
                  value={form.dia}
                  onChange={e => set('dia', e.target.value)}
                  placeholder="Ex: 11" />
              </div>
              <div>
                <label className="label">Mês</label>
                <select className="select" required value={form.mes}
                  onChange={e => set('mes', e.target.value)}>
                  <option value="">Selecionar...</option>
                  {MESES_LABEL.map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Cidade
                  <span className="text-faint font-normal ml-1">(opcional)</span>
                </label>
                <input className="input" value={form.cidade}
                  onChange={e => set('cidade', e.target.value)}
                  placeholder="Ex: Divinópolis" />
              </div>
              <div>
                <label className="label">
                  Estado (UF)
                  <span className="text-faint font-normal ml-1">(opcional)</span>
                </label>
                <select className="select" value={form.estado}
                  onChange={e => set('estado', e.target.value)}>
                  <option value="">Selecionar UF...</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              <strong>Como funciona:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Com cidade + estado → aplica apenas a empresas dessa cidade</li>
                <li>Só estado → aplica a todas as empresas do estado</li>
                <li>Sem cidade/estado → aplica a todas as empresas do escritório</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={salvando} className="btn btn-primary">
                {salvando
                  ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  : editandoId ? 'Salvar alterações' : 'Cadastrar feriado'}
              </button>
              <button type="button" onClick={cancelar} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted text-sm">Carregando...</div>
          ) : feriados.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm font-semibold text-ink">Nenhum feriado municipal cadastrado</p>
              <p className="text-xs text-faint mt-1">Os feriados nacionais já são calculados automaticamente.</p>
              {isGestor && (
                <button onClick={() => setMostraForm(true)} className="btn btn-primary mt-4 mx-auto">
                  + Cadastrar primeiro feriado
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(porCidade).map(([cidade, lista]) => (
                <div key={cidade} className="card overflow-hidden">
                  <div className="card-header">
                    <span className="card-title">📍 {cidade}</span>
                    <span className="pill pill-blue text-[10px]">{lista.length} feriado{lista.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {lista.map(f => (
                        <tr key={f.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-ink">{f.nome}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">
                            {String(f.dia).padStart(2,'0')}/{String(f.mes).padStart(2,'0')}
                          </td>
                          <td className="px-4 py-3 text-xs text-faint">
                            {MESES_LABEL[f.mes - 1]}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isGestor && (
                              <div className="flex items-center gap-3 justify-end">
                                <button onClick={() => iniciarEdicao(f)} className="text-xs text-blue-600 hover:underline">Editar</button>
                                <button onClick={() => excluir(f.id, f.nome)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header cursor-pointer" onClick={() => setMostraNacionais(!mostraNacionais)}>
            <span className="card-title">Feriados nacionais</span>
            <span className="text-xs text-faint">{mostraNacionais ? '▲' : '▼'}</span>
          </div>
          {mostraNacionais && (
            <div className="p-3 space-y-1">
              <p className="text-xs text-faint mb-2">Calculados automaticamente — não precisam ser cadastrados.</p>
              {FERIADOS_NACIONAIS.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                  <span className="text-xs text-ink">{f.nome}</span>
                  {f.dia ? (
                    <span className="text-xs text-faint font-mono">
                      {String(f.dia).padStart(2,'0')}/{String(f.mes).padStart(2,'0')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-faint italic">variável</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 bg-surface2 border-t border-border">
            <p className="text-xs text-faint">
              <strong className="text-ink">Dias úteis</strong> = Segunda a Sábado, excluindo feriados nacionais e municipais cadastrados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
