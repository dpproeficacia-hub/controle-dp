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
          <div className="card-header
