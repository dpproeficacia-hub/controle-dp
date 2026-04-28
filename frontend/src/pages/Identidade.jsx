import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Identidade() {
  const [config, setConfig] = useState({
    nomeEscritorio: 'DPSmart',
    corPrimaria: '#1C1B19',
    corSecundaria: '#185FA5',
    whatsapp: '',
    email: '',
    logo: '',
  });
  const [salvo, setSalvo] = useState(false);
  const [aba, setAba] = useState('visual');
  const [tarefasGlobais, setTarefasGlobais] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState({ nome:'', paraTodas:false, paraFuncionarios:false, paraProLabore:false, paraSemMovimento:false });
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dp_identidade');
    if (saved) setConfig(JSON.parse(saved));
    carregarTarefas();
  }, []);

  function carregarTarefas() {
    api.get('/tarefas/globais/listar').then(r => setTarefasGlobais(r.data)).catch(() => {});
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('logo', ev.target.result);
    reader.readAsDataURL(file);
  }

  function salvar(e) {
    e.preventDefault();
    localStorage.setItem('dp_identidade', JSON.stringify(config));
    window.dispatchEvent(new Event('storage'));
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function adicionarTarefaGlobal(e) {
    e.preventDefault();
    if (!novaTarefa.nome.trim()) return;
    if (!novaTarefa.paraTodas && !novaTarefa.paraFuncionarios && !novaTarefa.paraProLabore && !novaTarefa.paraSemMovimento) {
      alert('Selecione para quais empresas esta tarefa se aplica.');
      return;
    }
    setSalvandoTarefa(true);
    try {
      await api.post('/tarefas/globais/criar', novaTarefa);
      setNovaTarefa({ nome:'', paraTodas:false, paraFuncionarios:false, paraProLabore:false, paraSemMovimento:false });
      carregarTarefas();
    } finally {
      setSalvandoTarefa(false);
    }
  }

  async function removerTarefa(id) {
    if (!window.confirm('Remover esta tarefa global?')) return;
    await api.delete(`/tarefas/${id}`);
    carregarTarefas();
  }

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const setNT = (k, v) => setNovaTarefa(c => ({ ...c, [k]: v }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-bold text-lg text-ink">Configurações do sistema</h2>
        <p className="text-sm text-muted mt-0.5">Identidade visual e tarefas globais</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[['visual','Identidade Visual'],['tarefas','Tarefas Globais']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${aba===id?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'visual' && (
        <div className="grid grid-cols-[1fr_320px] gap-6 max-w-4xl">
          <form onSubmit={salvar} className="space-y-4">
            <div className="card">
              <div className="card-header"><span className="card-title">Logo do escritório</span></div>
              <div className="p-5 flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border2 flex items-center justify-center overflow-hidden bg-surface2 flex-shrink-0">
                  {config.logo
                    ? <img src={config.logo} alt="logo" className="w-full h-full object-contain p-1" />
                    : <span className="text-2xl">🏢</span>
                  }
                </div>
                <div>
                  <label className="btn btn-secondary cursor-pointer text-sm">
                    {config.logo ? 'Trocar logo' : 'Fazer upload da logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  </label>
                  {config.logo && (
                    <button type="button" onClick={() => set('logo','')} className="ml-2 text-xs text-red-500 hover:underline">Remover</button>
                  )}
                  <p className="text-xs text-faint mt-1.5">PNG, JPG ou SVG · Recomendado: 200x200px</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Informações do escritório</span></div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">Nome do escritório</label>
                  <input className="input" value={config.nomeEscritorio} onChange={e => set('nomeEscritorio', e.target.value)} placeholder="Ex: Contabilidade Silva" />
                </div>
                <div>
                  <label className="label">WhatsApp de suporte</label>
                  <input className="input" value={config.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Ex: 37999999999" />
                </div>
                <div>
                  <label className="label">E-mail de contato</label>
                  <input className="input" type="email" value={config.email} onChange={e => set('email', e.target.value)} placeholder="contato@escritorio.com.br" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Cores do sistema</span></div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cor primária (sidebar)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" value={config.corPrimaria} onChange={e => set('corPrimaria', e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <input className="input flex-1" value={config.corPrimaria} onChange={e => set('corPrimaria', e.target.value)} />
                  </div>
                </div>
