import { useState, useEffect } from 'react';

export default function Identidade() {
  const [config, setConfig] = useState({
    nomeEscritorio: 'DPSmart',
    corPrimaria: '#1C1B19',
    corSecundaria: '#185FA5',
    whatsapp: '',
    email: '',
  });
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dp_identidade');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  function salvar(e) {
    e.preventDefault();
    localStorage.setItem('dp_identidade', JSON.stringify(config));
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-bold text-lg text-ink">Identidade Visual</h2>
        <p className="text-sm text-muted mt-0.5">Personalize o sistema com as cores e informações do escritório</p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 max-w-4xl">
        <form onSubmit={salvar} className="space-y-4">
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
                <label className="label">Cor primária (sidebar e botões)</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={config.corPrimaria} onChange={e => set('corPrimaria', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <input className="input flex-1" value={config.corPrimaria} onChange={e => set('corPrimaria', e.target.value)} placeholder="#1C1B19" />
                </div>
              </div>
              <div>
                <label className="label">Cor secundária (destaques)</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={config.corSecundaria} onChange={e => set('corSecundaria', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <input className="input flex-1" value={config.corSecundaria} onChange={e => set('corSecundaria', e.target.value)} placeholder="#185FA5" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">
              {salvo ? '✓ Salvo!' : 'Salvar configurações'}
            </button>
          </div>
        </form>

        <div>
          <div className="card overflow-hidden">
            <div className="card-header"><span className="card-title">Pré-visualização</span></div>
            <div className="p-4">
              <div className="rounded-xl overflow-hidden border border-border" style={{fontSize:'11px'}}>
                <div style={{background: config.corPrimaria, padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'22px',height:'22px',background:'rgba(255,255,255,0.2)',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                        <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                        <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                        <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                        <rect x="9" y="9" width="6" height="6" rx="1.5"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{color:'white',fontWeight:'700',fontSize:'12px'}}>{config.nomeEscritorio || 'DPSmart'}</div>
                      <div style={{color:'rgba(255,255,255,0.6)',fontSize:'9px'}}>DEPTO. PESSOAL</div>
                    </div>
                  </div>
                  <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'4px'}}>
                    {['Dashboard','Controle Mensal','Empresas','Sindical / CCT'].map((item, i) => (
                      <div key={item} style={{
                        padding:'6px 8px', borderRadius:'6px',
                        background: i===0 ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize:'10px'
                      }}>{item}</div>
                    ))}
                  </div>
                </div>
                <div style={{padding:'10px',background:'#F4F3EF'}}>
                  <div style={{background:config.corSecundaria,color:'white',borderRadius:'6px',padding:'6px 10px',fontSize:'10px',fontWeight:'600',display:'inline-block'}}>
                    + Nova Empresa
                  </div>
                  <div style={{marginTop:'8px',background:'white',borderRadius:'6px',padding:'8px',border:'1px solid #E4E3DF'}}>
                    <div style={{fontWeight:'600',marginBottom:'4px',fontSize:'10px'}}>Comércio Alves Ltda</div>
                    <div style={{color:'#6B6A66',fontSize:'9px'}}>12.345.678/0001-90</div>
                  </div>
                </div>
              </div>
              {config.whatsapp && (
                <div className="mt-3 text-xs text-muted flex items-center gap-1">
                  <span>📱</span> Suporte: {config.whatsapp}
                </div>
              )}
              {config.email && (
                <div className="mt-1 text-xs text-muted flex items-center gap-1">
                  <span>✉️</span> {config.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
