import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const SETORES_PADRAO = ['Pessoal', 'Fiscal', 'Contábil', 'Societário', 'Outros'];
const NIVEL_PILL = { ADMIN: 'pill-purple', GESTOR: 'pill-blue', OPERADOR: 'pill-gray' };
const formUsuarioVazio = { nome: '', email: '', senha: '', nivel: 'OPERADOR' };

export function Responsaveis() {
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loadingU, setLoadingU] = useState(true);
  const [loadingS, setLoadingS] = useState(true);
  const [formU, setFormU] = useState(formUsuarioVazio);
  const [formS, setFormS] = useState({ setor: 'Pessoal', responsavel: '' });
  const [mostraFormU, setMostraFormU] = useState(false);
  const [mostraFormS, setMostraFormS] = useState(false);
  const [salvandoU, setSalvandoU] = useState(false);
  const [salvandoS, setSalvandoS] = useState(false);
  const [aba, setAba] = useState('usuarios');
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const { isAdmin, isGestor, usuario } = useAuth();

  useEffect(() => {
    carregarUsuarios();
    const s = localStorage.getItem('dp_setores');
    if (s) setSetores(JSON.parse(s));
    setLoadingS(false);
  }, []);

  function carregarUsuarios() {
    setLoadingU(true);
    api.get('/responsaveis').then(r => setUsuarios(r.data)).finally(() => setLoadingU(false));
  }

  function iniciarEdicao(u) {
    setEditandoId(u.id);
    setFormU({ nome: u.nome, email: u.email, senha: '', nivel: u.nivel });
    setMostrarSenha(false);
    setMostraFormU(true);
    window.scrollTo(0, 0);
  }

  function cancelarFormU() {
    setEditandoId(null);
    setFormU(formUsuarioVazio);
    setMostraFormU(false);
    setMostrarSenha(false);
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    setSalvandoU(true);
    try {
      if (editandoId) {
        const payload = { nome: formU.nome, email: formU.email, nivel: formU.nivel };
        if (formU.senha) payload.senha = formU.senha;
        const { data } = await api.put(`/responsaveis/${editandoId}`, payload);
        setUsuarios(us => us.map(u => u.id === editandoId ? data : u));
      } else {
        const { data } = await api.post('/responsaveis', formU);
        setUsuarios(us => [...us, data]);
      }
      cancelarFormU();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSalvandoU(false);
    }
  }

  async function excluirUsuario(u) {
    if (u.id === usuario?.id) {
      alert('Você não pode excluir sua própria conta.');
      return;
    }
    if (!window.confirm(`Desativar o usuário "${u.nome}"? Ele não conseguirá mais fazer login.`)) return;
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
    if (existente >= 0) {
      novos = setores.map((s, i) => i === existente ? formS : s);
    } else {
      novos = [...setores, formS];
    }
    salvarSetoresLocal(novos);
    setFormS({ setor: 'Pessoal', responsavel: '' });
    setMostraFormS(false);
  }

  function removerSetor(setor) {
    salvarSetoresLocal(setores.filter(s => s.setor !== setor));
  }

  const podeGerenciar = isAdmin || isGestor;

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
            <form onSubmit={salvarUsuario} className="card p-5 mb-4 max-w-xl">
              <p className="text-sm font-semibold text-ink mb-4">
                {editandoId ? 'Editar usuário' : 'Novo usuário'}
              </p>
              <div className="grid grid-cols-2 gap-4">
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
                    <button type="button"
                      onClick={() => setMostrarSenha(s => !s)}
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
                <div className="col-span-2 flex gap-3">
                  <button type="submit" disabled={salvandoU} className="btn btn-primary">
                    {salvandoU
                      ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                      : editandoId ? 'Salvar alterações' : 'Criar usuário'}
                  </button>
                  <button type="button" onClick={cancelarFormU} className="btn btn-secondary">Cancelar</button>
                </div>
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
                    {['Usuário', 'Email', 'Nível de acesso', 'Criado em', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
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
                      <td className="px-4 py-3"><span className={`pill ${NIVEL_PILL[u.nivel]}`}>{u.nivel}</span></td>
                      <td className="px-4 py-3 text-sm text-muted">{new Date(u.criadoEm).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right">
                        {podeGerenciar && (
                          <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => iniciarEdicao(u)}
                              className="text-xs text-blue-600 hover:underline">Editar</button>
                            {u.id !== usuario?.id && (
                              <button onClick={() => excluirUsuario(u)}
                                className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-faint">Nenhum usuário cadastrado.</td></tr>
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
                  <button type="submit" disabled={salvandoS} className="btn btn-primary">Salvar</button>
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
                      <button onClick={() => removerSetor(setor)} className="text-xs text-red-400 hover:text-red-600">✕</button>
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

export default Responsaveis;
