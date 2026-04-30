import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const TIPOS = [
  { key: 'paraTodas', label: 'Todas as empresas', pill: 'pill-gray' },
  { key: 'paraFuncionarios', label: 'Com funcionários', pill: 'pill-green' },
  { key: 'paraProLabore', label: 'Pró-labore', pill: 'pill-blue' },
  { key: 'paraSemMovimento', label: 'Sem movimento', pill: 'pill-amber' },
];

const formVazio = {
  nome: '', prazoEntregaDia: '',
  paraTodas: false, paraFuncionarios: false,
  paraProLabore: false, paraSemMovimento: false,
};

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);
  const { isGestor } = useAuth();

  useEffect(() => { carregar(); }, []);

  function carregar() {
    setLoading(true);
    api.get('/tarefas/globais/listar')
      .then(r => setTarefas(r.data))
      .finally(() => setLoading(false));
  }

  function iniciarEdicao(t) {
    setEditando(t.id);
    setForm({
      nome: t.nome,
      prazoEntregaDia: t.prazoEntregaDia || '',
      paraTodas: t.paraTodas,
      paraFuncionarios: t.paraFuncionarios,
      paraProLabore: t.paraProLabore,
      paraSemMovimento: t.paraSemMovimento,
    });
    setMostraForm(true);
    window.scrollTo(0, 0);
  }

  function cancelar() {
    setEditando(null);
    setForm(formVazio);
    setMostraForm(false);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.paraTodas && !form.paraFuncionarios && !form.paraProLabore && !form.paraSemMovimento) {
      alert('Selecione pelo menos um tipo de empresa.');
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/tarefas/globais/${editando}`, form);
      } else {
        await api.post('/tarefas/globais/criar', form);
      }
      cancelar();
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(t) {
    if (!window.confirm(`Remover tarefa "${t.nome}"?`)) return;
    await api.delete(`/tarefas/${t.id}`);
    carregar();
  }

  function toggleTipo(key) {
    setForm(f => ({ ...f, [key]: !f[key] }));
  }

  function getTiposAtivos(t) {
    return TIPOS.filter(tipo => t[tipo.key]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Tarefas Extras</h2>
          <p className="text-sm text-muted mt-0.5">
            Tarefas que aparecem automaticamente no controle mensal conforme o tipo de empresa
          </p>
        </div>
        {isGestor && (
          <button onClick={() => { cancelar(); setMostraForm(!mostraForm); }}
            className="btn btn-primary">
            {mostraForm && !editando ? 'Cancelar' : '+ Nova tarefa'}
          </button>
        )}
      </div>

      {mostraForm && isGestor && (
        <form onSubmit={salvar} className="card p-5 mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">
            {editando ? 'Editar tarefa' : 'Nova tarefa global'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Nome da tarefa</label>
              <input className="input" required value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Relatório de Líquidos, FGTS Digital..." />
            </div>

            <div>
              <label className="label">Prazo de entrega (dia do mês)</label>
              <input className="input w-40" type="number" min="1" max="31"
                value={form.prazoEntregaDia}
                onChange={e => setForm(f => ({ ...f, prazoEntregaDia: e.target.value }))}
                placeholder="Ex: 7" />
              <p className="text-xs text-faint mt-1">Deixe em branco se não houver prazo fixo</p>
            </div>

            <div>
              <label className="label mb-2">Aplicar para</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(tipo => (
                  <div key={tipo.key}
                    onClick={() => toggleTipo(tipo.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                      form[tipo.key]
                        ? 'border-ink bg-ink/5'
                        : 'border-border bg-surface hover:border-border2'
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      form[tipo.key] ? 'bg-ink border-ink' : 'border-border2'
                    }`}>
                      {form[tipo.key] && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-ink">{tipo.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : editando ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
            <button type="button" onClick={cancelar} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : tarefas.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma tarefa cadastrada.</p>
          <p className="text-faint text-xs mt-1">Clique em "Nova tarefa" para começar.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Tarefa','Aplica para','Prazo',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tarefas.map(t => (
                <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                  <td className="px-4 py-3 text-sm font-semibold text-ink">{t.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {getTiposAtivos(t).map(tipo => (
                        <span key={tipo.key} className={`pill ${tipo.pill} text-[10px]`}>{tipo.label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {t.prazoEntregaDia ? `Dia ${t.prazoEntregaDia}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {isGestor && (
                        <>
                          <button onClick={() => iniciarEdicao(t)}
                            className="text-xs text-blue-600 hover:underline">Editar</button>
                          <button onClick={() => excluir(t)}
                            className="text-xs text-red-500 hover:underline">Remover</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-surface2 rounded-lg border border-border">
        <p className="text-xs font-semibold text-ink mb-2">Como funciona</p>
        <p className="text-xs text-muted leading-relaxed">
          As tarefas cadastradas aqui aparecem automaticamente no controle mensal de cada empresa conforme o tipo selecionado.
          Tarefas com prazo mostram um alerta quando a data limite se aproxima.
          Além das tarefas globais, cada empresa pode ter tarefas específicas cadastradas diretamente na tela de controle mensal.
        </p>
      </div>
    </div>
  );
}
