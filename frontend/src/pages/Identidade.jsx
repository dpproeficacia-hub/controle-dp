import { useState, useEffect } from 'react';
import api from '../lib/api';

const COR_PADRAO = '#1C1B19';

export default function Identidade() {
  const [config, setConfig] = useState({
    nomeEscritorio: '',
    corPrimaria: COR_PADRAO,
    logo: '',
    whatsapp: '',
    email: '',
  });
  const [original, setOriginal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const { data } = await api.get('/escritorio/config');
      const c = {
        nomeEscritorio: data.nome || '',
        corPrimaria: data.corPrimaria || COR_PADRAO,
        logo: data.logo || '',
        whatsapp: data.whatsapp || '',
        email: data.emailContato || '',
      };
      setConfig(c);
      setOriginal(c);
    } catch {}
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('logo', ev.target.result);
    reader.readAsDataURL(file);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true); setErro('');
    try {
      await api.put('/escritorio/config', {
        nome: config.nomeEscritorio,
        corPrimaria: config.corPrimaria,
        logo: config.logo,
        whatsapp: config.whatsapp,
        emailContato: config.email,
      });
      // Atualiza localStorage para todos verem na mesma sessão
      localStorage.setItem('dp_identidade', JSON.stringify(config));
      window.dispatchEvent(new Event('storage'));
      setOriginal(config);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function restaurarPadrao() {
    if (window.confirm('Restaurar cor padrão do sistema?')) {
      set('corPrimaria', COR_PADRAO);
    }
  }

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const temAlteracoes = original && JSON.stringify(config) !== JSON.stringify(original);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-bold text-lg text-ink">Identidade Visual</h2>
        <p className="text-sm text-muted mt-0.5">Configurações salvas no servidor — válidas para todos os usuários e dispositivos</p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 max-w-4xl">
        <form onSubmit={salvar} className="space-y-4">

          {/* Logo do escritório */}
          <div className="card">
            <div className="card-header"><span className="card-title">Logo do escritório</span></div>
            <div className="p-5 flex items-center gap-5">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border2 flex items-center justify-center overflow-hidden bg-surface2 flex-shrink-0">
                {config.logo
                  ? <img src={config.logo} alt="logo" className="w-full h-full object-contain p-1" />
                  : <span className="text-2xl">🏢</span>}
              </div>
              <div>
                <label className="btn btn-secondary cursor-pointer text-sm">
                  {config.logo ? 'Trocar logo' : 'Fazer upload da logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </label>
                {config.logo && (
                  <button type="button" onClick={() => set('logo', '')} className="ml-2 text-xs text-red-500 hover:underline">Remover</button>
                )}
                <p className="text-xs text-faint mt-1.5">PNG, JPG ou SVG · Recomendado: 200×200px</p>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="card">
            <div className="card-header"><span className="card-title">Informações do escritório</span></div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nome do escritório</label>
                <input className="input" value={config.nomeEscritorio}
                  onChange={e => set('nomeEscritorio', e.target.value)}
                  placeholder="Ex: Pro Eficácia Contabilidade" />
              </div>
              <div>
                <label className="label">WhatsApp de suporte</label>
                <input className="input" value={config.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="Ex: 37999999999" />
              </div>
              <div>
                <label className="label">E-mail de contato</label>
                <input className="input" type="email" value={config.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="contato@escritorio.com.br" />
              </div>
            </div>
          </div>

          {/* Cor */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Cor da sidebar</span>
              <button type="button" onClick={restaurarPadrao} className="text-xs text-muted hover:text-ink">
                Restaurar padrão
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <input type="color" value={config.corPrimaria}
                  onChange={e => set('corPrimaria', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <input className="input flex-1" value={config.corPrimaria}
                  onChange={e => set('corPrimaria', e.target.value)}
                  placeholder="#1C1B19" />
                {/* Chips de cores sugeridas */}
                <div className="flex gap-1.5">
                  {['#1C1B19','#0C1030','#161E6E','#1a3a2a','#3d1a1a'].map(cor => (
                    <div key={cor} onClick={() => set('corPrimaria', cor)}
                      className={`w-7 h-7 rounded-lg cursor-pointer border-2 transition-all ${config.corPrimaria === cor ? 'border-ink scale-110' : 'border-transparent hover:border-border2'}`}
                      style={{ background: cor }} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-faint mt-2">Esta cor aparece na sidebar para todos os usuários do escritório.</p>
            </div>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={salvando || !temAlteracoes} className="btn btn-primary disabled:opacity-50">
              {salvando
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : salvo ? '✓ Salvo para todos!' : 'Salvar configurações'}
            </button>
            {temAlteracoes && (
              <p className="text-xs text-amber-600">Alterações não salvas</p>
            )}
          </div>
        </form>

        {/* Preview */}
        <div className="card overflow-hidden sticky top-0">
          <div className="card-header"><span className="card-title">Pré-visualização</span></div>
          <div className="p-4">
            <div className="rounded-xl overflow-hidden border border-border">
              <div style={{ background: config.corPrimaria, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {config.logo ? (
                    <img src={config.logo} style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'contain', background: 'rgba(255,255,255,0.15)', padding: '2px' }} alt="logo" />
                  ) : (
                    <div style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="white"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
                    </div>
                  )}
                  <div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '12px' }}>{config.nomeEscritorio || 'DPSmart'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>DEPTO. PESSOAL</div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {['Dashboard', 'Controle Mensal', 'Empresas', 'Sindical / CCT'].map((item, i) => (
                    <div key={item} style={{ padding: '5px 8px', borderRadius: '5px', background: i === 0 ? 'rgba(255,255,255,0.2)' : 'transparent', color: i === 0 ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '10px' }}>{item}</div>
                  ))}
                </div>
                {/* Rodapé Códex */}
                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 32 L31 60 L50 88" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M70 32 L89 60 L70 88" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".82"/>
                    <line x1="60" y1="30" x2="60" y2="90" stroke="#B4B8FF" strokeWidth="6" strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', letterSpacing: '0.05em' }}>by Códex</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
