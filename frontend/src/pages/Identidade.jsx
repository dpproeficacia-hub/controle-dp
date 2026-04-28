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
                <div>
                  <label className="label">Cor secundária (botões)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" value={config.corSecundaria} onChange={e => set('corSecundaria', e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <input className="input flex-1" value={config.corSecundaria} onChange={e => set('corSecundaria', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">{salvo ? '✓ Salvo!' : 'Salvar configurações'}</button>
          </form>

          <div className="card overflow-hidden sticky top-0">
            <div className="card-header"><span className="card-title">Pré-visualização</span></div>
            <div className="p-4">
              <div className="rounded-xl overflow-hidden border border-border">
                <div style={{background: config.corPrimaria, padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {config.logo ? (
                      <img src={config.logo} style={{width:'24px',height:'24px',borderRadius:'6px',objectFit:'contain',background:'rgba(255,255,255,0.15)',padding:'2px'}} alt="logo"/>
                    ) : (
                      <div style={{width:'24px',height:'24px',background:'rgba(255,255,255,0.2)',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="white"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
                      </div>
                    )}
                    <div>
                      <div style={{color:'white',fontWeight:'700',fontSize:'12px'}}>{config.nomeEscritorio||'DPSmart'}</div>
                      <div style={{color:'rgba(255,255,255,0.5)',fontSize:'9px'}}>DEPTO. PESSOAL</div>
                    </div>
                  </div>
                  <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'3px'}}>
                    {['Dashboard','Controle Mensal','Empresas','Sindical / CCT'].map((item,i) => (
                      <div key={item} style={{padding:'5px 8px',borderRadius:'5px',background:i===0?'rgba(255,255,255,0.2)':'transparent',color:i===0?'white':'rgba(255,255,255,0.7)',fontSize:'10px'}}>{item}</div>
                    ))}
                  </div>
                </div>
                <div style={{padding:'10px',background:'#F4F3EF'}}>
                  <div style={{background:config.corSecundaria,color:'white',borderRadius:'6px',padding:'5px 10px',fontSize:'10px',fontWeight:'600',display:'inline-block'}}>+ Nova Empresa</div>
                  <div style={{marginTop:'8px',background:'white',borderRadius:'6px',padding:'8px',border:'1px solid #E4E3DF'}}>
                    <div style={{fontWeight:'600',fontSize:'10px'}}>Comércio Alves Ltda</div>
                    <div style={{color:'#6B6A66',fontSize:'9px',marginTop:'2px'}}>12.345.678/0001-90</div>
                  </div>
                </div>
              </div>
              {config.whatsapp && <p className="text-xs text-muted mt-2">📱 {config.whatsapp}</p>}
              {config.email && <p className="text-xs text-muted mt-1">✉️ {config.email}</p>}
            </div>
          </div>
        </div>
      )}

      {aba === 'tarefas' && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="card-header"><span className="card-title">Nova tarefa global</span></div>
            <form onSubmit={adicionarTarefaGlobal} className="p-5 space-y-4">
              <div>
                <label className="label">Nome da tarefa</label>
                <input className="input" required value={novaTarefa.nome} onChange={e => setNT('nome', e.target.value)} placeholder="Ex: Relatório de líquidos, Relatório gerencial..." />
              </div>
              <div>
                <label className="label">Aplicar para</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    ['paraTodas','Todas as empresas','border-ink bg-ink text-bg','border-border bg-surface2'],
                    ['paraFuncionarios','Com funcionários','border-green-600 bg-green-50 text-green-800','border-border bg-surface2'],
                    ['paraProLabore','Com pró-labore','border-blue-600 bg-blue-50 text-blue-800','border-border bg-surface2'],
                    ['paraSemMovimento','Sem movimento','border-amber-600 bg-amber-50 text-amber-800','border-border bg-surface2'],
                  ].map(([campo, label, ativo, inativo]) => (
                    <div key={campo} onClick={() => setNT(campo, !novaTarefa[campo])}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${novaTarefa[campo] ? ativo : inativo}`}>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={salvandoTarefa} className="btn btn-primary">
                {salvandoTarefa ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : '+ Adicionar tarefa global'}
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title">Tarefas globais cadastradas</span>
              <span className="pill pill-gray">{tarefasGlobais.length}</span>
            </div>
            {tarefasGlobais.length === 0 ? (
              <div className="p-8 text-center text-sm text-faint">Nenhuma tarefa global cadastrada ainda.</div>
            ) : (
              <div>
                {tarefasGlobais.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-b-0 hover:bg-surface2">
                    <div>
                      <p className="text-sm font-medium text-ink">{t.nome}</p>
                      <div className="flex gap-1.5 mt-1">
                        {t.paraTodas && <span className="pill pill-gray text-[10px]">Todas</span>}
                        {t.paraFuncionarios && <span className="pill pill-green text-[10px]">Funcionários</span>}
                        {t.paraProLabore && <span className="pill pill-blue text-[10px]">Pró-labore</span>}
                        {t.paraSemMovimento && <span className="pill pill-amber text-[10px]">Sem movimento</span>}
                      </div>
                    </div>
                    <button onClick={() => removerTarefa(t.id)} className="text-xs text-red-400 hover:text-red-600 ml-4">Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
