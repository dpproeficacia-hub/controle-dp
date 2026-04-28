import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ENQUADRAMENTOS = ['SIMPLES_NACIONAL','LUCRO_PRESUMIDO','LUCRO_REAL'];
const TIPOS = ['COMERCIO','INDUSTRIA','SERVICOS','ADVOCACIA','CLINICA','HOLDING','CONSTRUCAO_CIVIL','RURAL','DOMESTICO','TRANSPORTES','OUTROS'];
const NIVEIS = ['N1','N2','N3','N4','N5'];

export default function EmpresaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdicao = Boolean(id);

  const [form, setForm] = useState({
    razaoSocial:'', cnpj:'', enquadramento:'SIMPLES_NACIONAL', tipo:'COMERCIO',
    nivel:'N3', prazoEntrega:'', responsavelId:'',
    temFuncionarios:false, temProLabore:false, semMovimento:false,
    temFilial:false, fatorR:false, enviaReinf:false, observacoes:''
  });

  const [sindical, setSindical] = useState({
    sindicato:'', dataBase:'', ultimaCct: new Date().getFullYear(), reajusteAplicado: false
  });

  const [responsaveis, setResponsaveis] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/responsaveis').then(r => setResponsaveis(r.data));
    if (isEdicao) {
      api.get(`/empresas/${id}`).then(r => {
        const d = r.data;
        setForm({
          razaoSocial: d.razaoSocial, cnpj: d.cnpj,
          enquadramento: d.enquadramento, tipo: d.tipo, nivel: d.nivel,
          prazoEntrega: d.prazoEntrega || '', responsavelId: d.responsavelId || '',
          temFuncionarios: d.temFuncionarios, temProLabore: d.temProLabore,
          semMovimento: d.semMovimento, temFilial: d.temFilial,
          fatorR: d.fatorR, enviaReinf: d.enviaReinf, observacoes: d.observacoes || ''
        });
        if (d.sindical) {
          setSindical({
            sindicato: d.sindical.sindicato || '',
            dataBase: d.sindical.dataBase || '',
            ultimaCct: d.sindical.ultimaCct || new Date().getFullYear(),
            reajusteAplicado: d.sindical.reajusteAplicado || false
          });
        }
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSind = (k, v) => setSindical(f => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true); setErro('');
    try {
      let empresaId = id;
      if (isEdicao) {
        await api.put(`/empresas/${id}`, form);
      } else {
        const { data } = await api.post('/empresas', form);
        empresaId = data.id;
      }
      if (sindical.sindicato) {
        await api.put(`/sindical/${empresaId}`, sindical);
      }
      navigate('/empresas');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setSalvando(false);
    }
  }

  const Toggle = ({ campo, label }) => (
    <div onClick={() => set(campo, !form[campo])}
      className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className={`w-9 h-5 rounded-full relative transition-colors ${form[campo]?'bg-ink':'bg-border2'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form[campo]?'translate-x-4':'translate-x-0.5'}`} style={{boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-faint mb-5">
        <button onClick={() => navigate('/empresas')} className="text-blue-600 hover:underline">Empresas</button>
        <span>›</span>
        <span className="text-ink font-medium">{isEdicao ? 'Editar empresa' : 'Nova empresa'}</span>
      </div>

      <form onSubmit={salvar} className="max-w-2xl space-y-4">

        <div className="card">
          <div className="card-header"><span className="card-title">Dados principais</span></div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Razão Social</label>
              <input className="input" required value={form.razaoSocial} onChange={e => set('razaoSocial',e.target.value)} placeholder="Nome completo da empresa" />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input className="input" required value={form.cnpj} onChange={e => set('cnpj',e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="label">Enquadramento tributário</label>
              <select className="select" value={form.enquadramento} onChange={e => set('enquadramento',e.target.value)}>
                {ENQUADRAMENTOS.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo da empresa</label>
              <select className="select" value={form.tipo} onChange={e => set('tipo',e.target.value)}>
                {TIPOS.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsável</label>
              <select className="select" value={form.responsavelId} onChange={e => set('responsavelId',e.target.value)}>
                <option value="">Selecionar...</option>
                {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nível de complexidade</label>
              <select className="select" value={form.nivel} onChange={e => set('nivel',e.target.value)}>
                {NIVEIS.map(n => <option key={n} value={n}>{n} — {n==='N1'?'Mais complexo / urgente':n==='N5'?'Menos complexo / sem movimento':'Intermediário'}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prazo de entrega (dia do mês)</label>
              <input className="input" type="number" min="1" max="31" value={form.prazoEntrega} onChange={e => set('prazoEntrega',Number(e.target.value))} placeholder="Ex: 25" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Configurações operacionais</span></div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <Toggle campo="temFuncionarios" label="Tem funcionários?" />
            <Toggle campo="temProLabore" label="Tem pró-labore?" />
            <Toggle campo="semMovimento" label="Empresa sem movimento?" />
            <Toggle campo="enviaReinf" label="Envia REINF?" />
            <Toggle campo="fatorR" label="Empresa fator R?" />
            <Toggle campo="temFilial" label="Possui filial?" />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Controle Sindical / CCT</span></div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome do sindicato</label>
              <input className="input" value={sindical.sindicato} onChange={e => setSind('sindicato',e.target.value)} placeholder="Ex: Sindicato dos Comerciários MG" />
            </div>
            <div>
              <label className="label">Data-base (dia/mês)</label>
              <input className="input" value={sindical.dataBase} onChange={e => setSind('dataBase',e.target.value)} placeholder="Ex: 01/03" />
            </div>
            <div>
              <label className="label">Última CCT (ano)</label>
              <input className="input" type="number" value={sindical.ultimaCct} onChange={e => setSind('ultimaCct',Number(e.target.value))} placeholder="Ex: 2026" />
            </div>
            <div className="col-span-2">
              <div onClick={() => setSind('reajusteAplicado', !sindical.reajusteAplicado)}
                className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors">
                <span className="text-sm font-medium text-ink">Reajuste já aplicado?</span>
                <div className={`w-9 h-5 rounded-full relative transition-colors ${sindical.reajusteAplicado?'bg-ink':'bg-border2'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${sindical.reajusteAplicado?'translate-x-4':'translate-x-0.5'}`} style={{boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Observações / Particularidades</span></div>
          <div className="p-5">
            <textarea className="input h-20 resize-y py-2 leading-relaxed" value={form.observacoes}
              onChange={e => set('observacoes',e.target.value)}
              placeholder="Ex: cliente envia ponto atrasado · empresa possui comissão variável..." />
          </div>
        </div>

        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="btn btn-primary">
            {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : isEdicao ? 'Salvar alterações' : 'Cadastrar empresa'}
          </button>
          <button type="button" onClick={() => navigate('/empresas')} className="btn btn-secondary">Cancelar</button>
        </div>

      </form>
    </div>
  );
}
