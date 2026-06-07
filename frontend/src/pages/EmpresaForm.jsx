import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

const ENQUADRAMENTOS = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO',  label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL',       label: 'Lucro Real' },
  { value: 'MEI',              label: 'MEI' },
  { value: 'CEI',              label: 'CEI' },
  { value: 'DOMESTICA',        label: 'Doméstica' },
  { value: 'PRODUTOR_RURAL',   label: 'Produtor Rural' },
  { value: 'PESSOA_FISICA',    label: 'Pessoa Física' },
  { value: 'ENTIDADES',        label: 'Entidades' },
];

const ANEXOS = [
  { value: 'ANEXO_I',   label: 'Anexo I',   desc: 'Comércio' },
  { value: 'ANEXO_II',  label: 'Anexo II',  desc: 'Indústria' },
  { value: 'ANEXO_III', label: 'Anexo III', desc: 'Serviços em geral (locação, prestação)' },
  { value: 'ANEXO_IV',  label: 'Anexo IV',  desc: 'Serviços (construção, vigilância, limpeza)' },
  { value: 'ANEXO_V',   label: 'Anexo V',   desc: 'Serviços intelectuais, TI, publicidade' },
];

const TIPOS_DOCUMENTO = [
  { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0001-00', tamanho: 18 },
  { value: 'CPF',  label: 'CPF',  placeholder: '000.000.000-00',     tamanho: 14 },
  { value: 'CEI',  label: 'CEI',  placeholder: '00.000.00000/00',    tamanho: 16 },
  { value: 'CNO',  label: 'CNO',  placeholder: '00.000.00000/00',    tamanho: 16 },
];

const TIPOS = ['COMERCIO','INDUSTRIA','SERVICOS','ADVOCACIA','CLINICA','HOLDING','CONSTRUCAO_CIVIL','RURAL','DOMESTICO','TRANSPORTES','OUTROS'];
const NIVEIS = ['N1','N2','N3','N4','N5'];

function aplicarMascara(valor, tipoDoc) {
  const nums = valor.replace(/\D/g, '');
  if (tipoDoc === 'CPF')  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
  if (tipoDoc === 'CNPJ') return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  if (tipoDoc === 'CEI' || tipoDoc === 'CNO') return nums.replace(/(\d{2})(\d{3})(\d{5})(\d{2})/, '$1.$2.$3/$4').slice(0, 16);
  return valor;
}

export default function EmpresaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdicao = Boolean(id);

  // Lista de IDs para navegação entre empresas
  const listaIds = location.state?.listaIds || [];
  const idxAtual = listaIds.indexOf(id);
  const idAnterior = idxAtual > 0 ? listaIds[idxAtual - 1] : null;
  const idProximo = idxAtual >= 0 && idxAtual < listaIds.length - 1 ? listaIds[idxAtual + 1] : null;

  const [form, setForm] = useState({
    razaoSocial: '', cnpj: '', tipoDocumento: 'CNPJ',
    enquadramento: 'SIMPLES_NACIONAL', anexoSimples: 'ANEXO_III',
    tipo: 'COMERCIO', nivel: 'N3', prazoEntrega: '', responsavelId: '',
    temFuncionarios: false, temProLabore: false, semMovimento: false,
    temFilial: false, fatorR: false, enviaReinf: false, observacoes: ''
  });

  const [sindical, setSindical] = useState({
    sindicatoId: '', ultimaCct: new Date().getFullYear(), reajusteAplicado: false
  });

  const [filiaisIds, setFiliaisIds] = useState([]);
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/responsaveis').then(r => setResponsaveis(r.data));
    api.get('/sindical/sindicatos').then(r => setSindicatos(r.data));
    api.get('/empresas').then(r => setTodasEmpresas(r.data));
  }, []);

  useEffect(() => {
    if (!isEdicao) return;
    setSalvoOk(false);
    setErro('');
    api.get(`/empresas/${id}`).then(r => {
      const d = r.data;
      setForm({
        razaoSocial: d.razaoSocial,
        cnpj: aplicarMascara(d.cnpj, d.tipoDocumento || 'CNPJ'),
        tipoDocumento: d.tipoDocumento || 'CNPJ',
        enquadramento: d.enquadramento,
        anexoSimples: d.anexoSimples || 'ANEXO_III',
        tipo: d.tipo,
        nivel: d.nivel,
        prazoEntrega: d.prazoEntrega || '',
        responsavelId: d.responsavelId || '',
        temFuncionarios: d.temFuncionarios,
        temProLabore: d.temProLabore,
        semMovimento: d.semMovimento,
        temFilial: d.temFilial,
        fatorR: d.fatorR,
        enviaReinf: d.enviaReinf,
        observacoes: d.observacoes || ''
      });
      if (d.sindical) {
        setSindical({
          sindicatoId: d.sindical.sindicatoId || '',
          ultimaCct: d.sindical.ultimaCct || new Date().getFullYear(),
          reajusteAplicado: d.sindical.reajusteAplicado || false
        });
      } else {
        setSindical({ sindicatoId: '', ultimaCct: new Date().getFullYear(), reajusteAplicado: false });
      }
      if (d.filiaisVinculadas) setFiliaisIds(d.filiaisVinculadas.map(f => f.id));
      else setFiliaisIds([]);
    });
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSind = (k, v) => setSindical(f => ({ ...f, [k]: v }));

  const tipoDocAtual = TIPOS_DOCUMENTO.find(t => t.value === form.tipoDocumento) || TIPOS_DOCUMENTO[0];
  const sindicatoSelecionado = sindicatos.find(s => s.id === sindical.sindicatoId);
  const isSimples = form.enquadramento === 'SIMPLES_NACIONAL' || form.enquadramento === 'MEI';

  function handleDocumento(e) {
    set('cnpj', aplicarMascara(e.target.value, form.tipoDocumento));
  }

  function handleTipoDocumento(novoTipo) {
    set('tipoDocumento', novoTipo);
    set('cnpj', '');
  }

  function handleEnquadramento(valor) {
    set('enquadramento', valor);
    if (valor !== 'SIMPLES_NACIONAL' && valor !== 'MEI') {
      set('anexoSimples', null);
    } else {
      set('anexoSimples', form.anexoSimples || 'ANEXO_III');
    }
  }

  function toggleFilial(empresaId) {
    setFiliaisIds(ids => ids.includes(empresaId) ? ids.filter(x => x !== empresaId) : [...ids, empresaId]);
  }

  const empresasDisponiveis = todasEmpresas.filter(emp => {
    if (emp.id === id) return false;
    if (emp.matrizId && emp.matrizId !== id) return false;
    return true;
  });

  function irParaEmpresa(novoId) {
    navigate(`/empresas/${novoId}/editar`, { state: { listaIds } });
  }

  async function salvar(e, irPara = null) {
    if (e) e.preventDefault();
    setSalvando(true); setErro(''); setSalvoOk(false);
    try {
      const payload = {
        ...form,
        anexoSimples: isSimples ? (form.anexoSimples || 'ANEXO_III') : null,
        filiaisIds: form.temFilial ? filiaisIds : []
      };
      let empresaId = id;
      if (isEdicao) {
        await api.put(`/empresas/${id}`, payload);
      } else {
        const { data } = await api.post('/empresas', payload);
        empresaId = data.id;
      }
      if (sindical.sindicatoId) {
        await api.put(`/sindical/${empresaId}`, sindical);
      }
      if (irPara) {
        irParaEmpresa(irPara);
      } else if (!isEdicao) {
        navigate('/empresas');
      } else {
        setSalvoOk(true);
        setTimeout(() => setSalvoOk(false), 3000);
      }
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
      <div className={`w-9 h-5 rounded-full relative transition-colors ${form[campo] ? 'bg-ink' : 'bg-border2'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form[campo] ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Barra superior — breadcrumb + navegação + salvar fixo */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-faint">
          <button onClick={() => navigate('/empresas')} className="text-blue-600 hover:underline">Empresas</button>
          <span>›</span>
          <span className="text-ink font-medium truncate max-w-xs">
            {isEdicao ? (form.razaoSocial || 'Editar empresa') : 'Nova empresa'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação entre empresas */}
          {listaIds.length > 1 && (
            <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg px-2 py-1">
              <button
                onClick={() => idAnterior && irParaEmpresa(idAnterior)}
                disabled={!idAnterior}
                className="text-xs px-2 py-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-muted"
                title="Empresa anterior">
                ← Anterior
              </button>
              <span className="text-xs text-faint px-1">
                {idxAtual + 1} / {listaIds.length}
              </span>
              <button
                onClick={() => idProximo && irParaEmpresa(idProximo)}
                disabled={!idProximo}
                className="text-xs px-2 py-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-muted"
                title="Próxima empresa">
                Próxima →
              </button>
            </div>
          )}

          {/* Botão salvar fixo no topo */}
          {isEdicao && (
            <button
              onClick={salvar}
              disabled={salvando}
              className={`btn text-sm px-4 py-2
