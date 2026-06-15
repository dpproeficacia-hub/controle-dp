import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const SETORES_PADRAO = ['Pessoal', 'Fiscal', 'Contábil', 'Societário', 'Outros'];
const NIVEL_PILL = { ADMIN: 'pill-purple', GESTOR: 'pill-blue', OPERADOR: 'pill-gray' };
const formUsuarioVazio = { nome: '', email: '', senha: '', nivel: 'OPERADOR' };

export default function Responsaveis() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loadingU, setLoadingU] = useState(true);
  const [formU, setFormU] = useState(formUsuarioVazio);
  const [formS, setFormS] = useState({ setor: 'Pessoal', responsavel: '' });
  const [mostraFormU, setMostraFormU] = useState(false);
  const [mostraFormS, setMostraFormS] = useState(false);
  const [salvandoU, setSalvandoU] = useState(false);
  const [aba, setAba] = useState('usuarios');
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  const { isAdmin, isGestor, usuario } = useAuth();

  useEffect(() => {
    carregarUsuarios();
    api.get('/empresas').then(r => setEmpresas(r.data));
    const s = localStorage.getItem('dp_setores');
    if (s) setSetores(JSON.parse(s));
  }, []);

  function carregarUsuarios() {
    setLoadingU(true);
    api.get('/responsaveis').then(r => setUsuarios(r.data)).finally(() => setLoadingU(false));
  }

  function iniciarEdicao(u) {
    setEditandoId(u.id);
    setFormU({ nome: u.nome, email: u.email, senha: '', nivel: u.nivel });
    setMostrarSenha(false);
    const vinculadas = empresas.filter(e => e.responsavelId === u.id).map(e => e.id);
    setEmpresasSelecionadas(vinculadas);
    setBuscaEmpresa('');
    setMostraFormU(true);
    window.scrollTo(0, 0);
  }

  function cancelarFormU() {
    setEditandoId(null);
    setFormU(formUsuarioVazio);
    setMostraFormU(false);
    setMostrarSenha(false);
    setEmpresasSelecionadas([]);
    setBuscaEmpresa('');
  }

  function toggleEmpresa(id) {
    setEmpresasSelecionadas(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    );
  }

  function toggleTodasEmpresas() {
    const visiveis = empresasFiltradas.map(e => e.id);
    const todasSelecionadas = visiveis.every(id => empresasSelecionadas.includes(id));
    if (todasSelecionadas) {
      setEmpresasSelecionadas(sel => sel.filter(id => !visiveis.includes(id)));
    } else {
      setEmpresasSelecionadas(sel => [...new Set([...sel, ...visiveis])]);
    }
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    setSalvandoU(true);
    try {
      let usuarioId = editandoId;

      // 1. Salva dados do usuário
      if (editandoId) {
        const payload = { nome: formU.nome, email: formU.email, nivel: formU.nivel };
        if (formU.senha) payload.senha = formU.senha;
        await api.put(`/responsaveis/${editandoId}`, payload);
      } else {
        const { data } = await api.post('/responsaveis', formU);
        usuarioId = data.id;
      }

      // 2. Atualiza empresas com UMA ÚNICA chamada ao backend (updateMany)
      const antesVinculadas = empresas
        .filter(e => e.responsavelId === usuarioId)
        .map(e => e.id);

      const adicionar = empresasSelecionadas.filter(id => !antesVinculadas.includes(id));
      const remover = antesVinculadas.filter(id => !empresasSelecionadas.includes(id));

      if (adicionar.length > 0 || remover.length > 0) {
        await api.post(`/responsaveis/${usuarioId}/empresas`, { adicionar, remover });
      }

      // 3. Recarrega empresas para refletir mudanças
      const { data: empAtual } = await api.get('/empresas');
      setEmpresas(empAtual);

      carregarUsuarios();
      cancelarFormU();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSalvandoU(false);
    }
  }

  async function excluirUsuario(u) {
    if (u.id === usuario?.id) { alert('Você não pode excluir sua própria conta.'); return; }
    if (!window.confirm(`Desativar o usuário "${u.nome}"?`)) return;
    try {
      await api.delete(`/responsaveis/${u.id}`);
      setUsuarios(us => us.filter(x => x.id !== u.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário');
    }
  }

  function salvarSetoresLocal(novos) {
    setSetores(novos);
    localStorage.setItem('dp_setores', JSON.stringify(novos));
  }

  function salvarSetor(e) {
    e.preventDefault();
    if (!formS.responsavel.trim()) return;
    const existente = setores.findIndex(s => s.setor === formS.setor);
    let novos;
    if (existente >= 0) novos = setores.map((s, i) => i === existente ? formS : s);
    else novos = [...setores, formS];
    salvarSetoresLocal(novos);
    setFormS({ setor: 'Pessoal', responsavel: '' });
    setMostraFormS(false);
  }

  const podeGerenciar = isAdmin || isGestor;
  const empresasFiltradas = empresas.filter(e =>
    !buscaEmpresa || e.razaoSocial.toLowerCase().includes(buscaEmpresa.toLowerCase())
  );
  const todasVisiveisSelecionadas = empresasFiltradas.length > 0 &&
    empresasFiltradas.every(e => empresasSelecionadas.includes(e.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-lg text-ink">Responsáveis</h2>
      </div>

      <div className="flex gap-2 mb-5">
        {[['usuarios', 'Usuários do sistema'], ['setores', 'Responsáveis por setor']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${aba === id ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'usuarios' && (
        <div>
          <div className="flex justify-end mb-4">
            {podeGerenciar && (
              <button onClick={() => { cancelarFormU(); setMostraFormU(!mostraFormU); }} className="btn btn-primary">
                {mostraFormU && !editandoId ? 'Cancelar' : '+ Novo usuário'}
              </button>
            )}
          </div>

          {mostraFormU && podeGerenciar && (
            <form onSubmit={salvarUsuario} className="card p-5 mb-4 max-w-2xl">
              <p className="text-sm font-semibold text-ink mb-4">
                {editandoId ? 'Editar usuário' : 'Novo usuário'}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Nome</label>
                  <input className="input" required value={formU.nome}
                    onChange={e => setFormU(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" required value={formU.email}
                    onChange={e => setFormU(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">
                    {editandoId ? 'Nova senha' : 'Senha inicial'}
                    {editandoId && <span className="text-faint ml-1">(opcional)</span>}
                  </label>
                  <div className="relative">
                    <input className="input pr-16"
                      type={mostrarSenha ? 'text' : 'password'}
                      required={!editandoId}
                      value={formU.senha}
                      onChange={e => setFormU(f => ({ ...f, senha: e.target.value }))}
                      placeholder={editandoId ? 'Deixe em branco para não alterar' : ''} />
                    <button type="button" onClick={() => setMostrarSenha(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs">
                      {mostrarSenha ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Nível de acesso</label>
                  <select className="select" value={formU.nivel}
                    onChange={e => setFormU(f => ({ ...f, nivel: e.target.value }))}>
                    <option value="OPERADOR">Operador DP</option>
                    <option value="GESTOR">Gestor do setor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Seleção de empresas */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">
                    Empresas sob responsabilidade
                    <span className="text-faint font-normal ml-1">
                      ({empresasSelecionadas.length} selecionada{empresasSelecionadas.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <button type="button" onClick={toggleTodasEmpresas}
                    className="text-xs text-blue-600 hover:underline">
                    {todasVisiveisSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                </div>
                <input className="input mb-2 text-xs h-8" placeholder="Buscar empresa..."
                  value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)} />
                <div className="border border-border rounded-lg max-h-52 overflow-y-auto">
                  {empresasFiltradas.length === 0 ? (
                    <p className="text-xs text-faint p-3 text-center">Nenhuma empresa encontrada</p>
                  ) : (
                    empresasFiltradas.map(emp => (
                      <label key={emp.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                        <div onClick={() => toggleEmpresa(emp.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${empresasSelecionadas.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                          {empresasSelecionadas.includes(emp.id) && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink truncate">{emp.razaoSocial}</p>
                          {emp.responsavelId && emp.responsavelId !== editandoId && (
                            <p className="text-[10px] text-amber-600">
                              já atribuída a {usuarios.find(u => u.id === emp.responsavelId)?.nome || 'outro'}
                            </p>
                          )}
                        </div>
                        {empresasSelecionadas.includes(emp.id) && (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-faint mt-1">
                  As empresas não selecionadas continuam com seus responsáveis atuais.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={salvandoU} className="btn btn-primary">
                  {salvandoU
                    ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    : editandoId ? 'Salvar alterações' : 'Criar usuário'}
                </button>
                <button type="button" onClick={cancelarFormU} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {loadingU ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface2">
                  <tr>
                    {['Usuário', 'Email', 'Nível', 'Empresas', 'Criado em', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => {
                    const qtdEmpresas = empresas.filter(e => e.responsavelId === u.id).length;
                    return (
                      <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-semibold text-purple-700">
                              {u.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-ink">{u.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`pill ${NIVEL_PILL[u.nivel]}`}>{u.nivel}</span>
                        </td>
                        <td className="px-4 py-3">
                          {qtdEmpresas > 0
                            ? <span className="pill pill-blue text-[10px]">{qtdEmpresas} empresa{qtdEmpresas !== 1 ? 's' : ''}</span>
                            : <span className="text-xs text-faint">Nenhuma</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {podeGerenciar && (
                            <div className="flex items-center gap-3 justify-end">
                              <button onClick={() => iniciarEdicao(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                              {u.id !== usuario?.id && (
                                <button onClick={() => excluirUsuario(u)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {usuarios.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-faint">Nenhum usuário cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'setores' && (
        <div>
          <div className="flex justify-end mb-4">
            {isGestor && (
              <button onClick={() => setMostraFormS(!mostraFormS)} className="btn btn-primary">
                {mostraFormS ? 'Cancelar' : '+ Definir responsável'}
              </button>
            )}
          </div>
          {mostraFormS && (
            <form onSubmit={salvarSetor} className="card p-5 mb-4 max-w-md">
              <p className="text-sm font-semibold text-ink mb-4">Definir responsável por setor</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Setor</label>
                  <select className="select" value={formS.setor}
                    onChange={e => setFormS(f => ({ ...f, setor: e.target.value }))}>
                    {SETORES_PADRAO.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Nome do responsável</label>
                  <input className="input" required value={formS.responsavel}
                    onChange={e => setFormS(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Ex: Marcos Vinícius" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary">Salvar</button>
                  <button type="button" onClick={() => setMostraFormS(false)} className="btn btn-secondary">Cancelar</button>
                </div>
              </div>
            </form>
          )}
          <div className="grid grid-cols-3 gap-4">
            {SETORES_PADRAO.map(setor => {
              const encontrado = setores.find(s => s.setor === setor);
              return (
                <div key={setor} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-faint">{setor}</span>
                    {encontrado && isGestor && (
                      <button onClick={() => salvarSetoresLocal(setores.filter(s => s.setor !== setor))}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    )}
                  </div>
                  {encontrado ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700 flex-shrink-0">
                        {encontrado.responsavel.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{encontrado.responsavel}</p>
                        <p className="text-xs text-faint">Responsável {setor}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-surface2 border-2 border-dashed border-border2 flex items-center justify-center text-faint">?</div>
                      <p className="text-sm text-faint">Não definido</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
