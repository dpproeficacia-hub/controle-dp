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

  const listaIds = location.state?.listaIds || [];
  const idxAtual = listaIds.indexOf(id);
  const idAnterior = idxAtual > 0 ? listaIds[idxAtual - 1] : null;
  const idProximo = idxAtual >= 0 && idxAtual < listaIds.length - 1 ? listaIds[idxAtual + 1] : null;

  const [form, setForm] = useState({
    razaoSocial: '', cnpj: '', tipoDocumento: 'CNPJ',
    enquadramento: 'SIMPLES_NACIONAL', anexoSimples: 'ANEXO_III',
    tipo: 'COMERCIO', nivel: 'N3', prazoEntrega: '', responsavelId: '',
    temFuncionarios: false, temProLabore: false, semMovimento: false,
    temFilial: false, fatorR: false, enviaReinf: false,
    participaTarefas: true, observacoes: ''
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
    setSalvoOk(false); setErro('');
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
        participaTarefas: d.participaTarefas !== false,
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
      setFiliaisIds(d.filiaisVinculadas ? d.filiaisVinculadas.map(f => f.id) : []);
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

  function irParaEmpresa(novoId) {
    navigate(`/empresas/${novoId}/editar`, { state: { listaIds } });
  }

  async function salvar(e, irPara) {
    if (e && e.preventDefault) e.preventDefault();
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
      // CORRIGIDO: sempre volta para /empresas após salvar
      if (irPara) {
        irParaEmpresa(irPara);
      } else {
        navigate('/empresas');
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setSalvando(false);
    }
  }

  const empresasDisponiveis = todasEmpresas.filter(emp => {
    if (emp.id === id) return false;
    if (emp.matrizId && emp.matrizId !== id) return false;
    return true;
  });

  const Toggle = ({ campo, label, descricao }) => (
    <div onClick={() => set(campo, !form[campo])}
      className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors">
      <div>
        <span className="text-sm font-medium text-ink">{label}</span>
        {descricao && <p className="text-xs text-faint mt-0.5">{descricao}</p>}
      </div>
      <div className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ml-3 ${form[campo] ? 'bg-ink' : 'bg-border2'}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form[campo] ? 'translate-x-4' : 'translate-x-0.5'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-faint">
          <button onClick={() => navigate('/empresas')} className="text-blue-600 hover:underline">Empresas</button>
          <span>›</span>
          <span className="text-ink font-medium truncate max-w-xs">
            {isEdicao ? (form.razaoSocial || 'Editar empresa') : 'Nova empresa'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {listaIds.length > 1 && (
            <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg px-2 py-1">
              <button type="button"
                onClick={() => idAnterior && irParaEmpresa(idAnterior)}
                disabled={!idAnterior}
                className="text-xs px-2 py-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-muted">
                ← Anterior
              </button>
              <span className="text-xs text-faint px-1">{idxAtual + 1} / {listaIds.length}</span>
              <button type="button"
                onClick={() => idProximo && irParaEmpresa(idProximo)}
                disabled={!idProximo}
                className="text-xs px-2 py-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-muted">
                Próxima →
              </button>
            </div>
          )}

          {isEdicao && (
            <button type="button" onClick={salvar} disabled={salvando}
              className="btn btn-primary text-sm px-4 py-2">
              {salvando
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : 'Salvar alterações'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={salvar} className="max-w-2xl space-y-4">

        {/* DADOS PRINCIPAIS */}
        <div className="card">
          <div className="card-header"><span className="card-title">Dados principais</span></div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Razão Social / Nome</label>
              <input className="input" required value={form.razaoSocial}
                onChange={e => set('razaoSocial', e.target.value)}
                placeholder="Nome completo da empresa ou pessoa" />
            </div>

            <div className="col-span-2">
              <label className="label">Documento</label>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                  {TIPOS_DOCUMENTO.map(td => (
                    <button key={td.value} type="button"
                      onClick={() => handleTipoDocumento(td.value)}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${form.tipoDocumento === td.value ? 'bg-ink text-bg' : 'bg-surface text-muted hover:bg-surface2'}`}>
                      {td.label}
                    </button>
                  ))}
                </div>
                <input className="input flex-1" required
                  value={form.cnpj}
                  onChange={handleDocumento}
                  placeholder={tipoDocAtual.placeholder}
                  maxLength={tipoDocAtual.tamanho} />
              </div>
              <p className="text-xs text-faint mt-1">
                {form.tipoDocumento === 'CPF'  && 'Para empregadores domésticos, produtores rurais e pessoas físicas'}
                {form.tipoDocumento === 'CEI'  && 'Cadastro Específico do INSS — obras e construções antigas'}
                {form.tipoDocumento === 'CNO'  && 'Cadastro Nacional de Obras — substituiu o CEI'}
                {form.tipoDocumento === 'CNPJ' && 'Cadastro Nacional de Pessoa Jurídica'}
              </p>
            </div>

            <div>
              <label className="label">Enquadramento tributário</label>
              <select className="select" value={form.enquadramento}
                onChange={e => handleEnquadramento(e.target.value)}>
                {ENQUADRAMENTOS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {isSimples && (
              <div>
                <label className="label">Anexo do Simples Nacional</label>
                <select className="select" value={form.anexoSimples || 'ANEXO_III'}
                  onChange={e => set('anexoSimples', e.target.value)}>
                  {ANEXOS.map(a => (
                    <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Tipo da empresa</label>
              <select className="select" value={form.tipo}
                onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Responsável</label>
              <select className="select" value={form.responsavelId}
                onChange={e => set('responsavelId', e.target.value)}>
                <option value="">Selecionar...</option>
                {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Nível de complexidade</label>
              <select className="select" value={form.nivel}
                onChange={e => set('nivel', e.target.value)}>
                {NIVEIS.map(n => (
                  <option key={n} value={n}>
                    {n} — {n === 'N1' ? 'Mais complexo' : n === 'N5' ? 'Menos complexo' : 'Intermediário'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Prazo de entrega (dia do mês)</label>
              <input className="input" type="number" min="1" max="31"
                value={form.prazoEntrega}
                onChange={e => set('prazoEntrega', Number(e.target.value))}
                placeholder="Ex: 25" />
            </div>
          </div>
        </div>

        {/* CONFIGURAÇÕES OPERACIONAIS */}
        <div className="card">
          <div className="card-header"><span className="card-title">Configurações operacionais</span></div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Toggle campo="temFuncionarios" label="Tem funcionários?" />
              <Toggle campo="temProLabore" label="Tem pró-labore?" />
              <Toggle campo="semMovimento" label="Empresa sem movimento?" />
              <Toggle campo="enviaReinf" label="Envia REINF?" />
              <Toggle campo="fatorR" label="Empresa fator R?" />
              <Toggle campo="temFilial" label="Possui filial?" />
            </div>

            <Toggle
              campo="participaTarefas"
              label="Participa do controle de tarefas?"
              descricao="Desative para empresas sem obrigações mensais a entregar" />

            {form.temFilial && (
              <div className="mt-1">
                <label className="label mb-2">
                  Selecionar empresas filiais
                  <span className="text-faint font-normal ml-1">(empresas que pertencem a esta matriz)</span>
                </label>
                {empresasDisponiveis.length === 0 ? (
                  <p className="text-xs text-faint p-3 bg-surface2 rounded-lg border border-border">
                    Nenhuma outra empresa disponível para vincular como filial.
                  </p>
                ) : (
                  <div className="border border-border rounded-lg max-h-52 overflow-y-auto">
                    {empresasDisponiveis.map(emp => (
                      <label key={emp.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                        <div onClick={() => toggleFilial(emp.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${filiaisIds.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                          {filiaisIds.includes(emp.id) && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink font-medium truncate">{emp.razaoSocial}</p>
                          <p className="text-xs text-faint font-mono">{emp.cnpj}</p>
                        </div>
                        {emp.matrizId === id && (
                          <span className="text-[10px] text-blue-600 font-semibold">já vinculada</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                {filiaisIds.length > 0 && (
                  <p className="text-xs text-muted mt-1.5">{filiaisIds.length} filial(is) selecionada(s)</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SINDICAL */}
        <div className="card">
          <div className="card-header"><span className="card-title">Controle Sindical / CCT</span></div>
          <div className="p-5 space-y-4">
            <div>
              <label className="label">Sindicato</label>
              <select className="select" value={sindical.sindicatoId}
                onChange={e => setSind('sindicatoId', e.target.value)}>
                <option value="">Sem sindicato vinculado</option>
                {sindicatos.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
              {sindicatoSelecionado && (
                <p className="text-xs text-muted mt-1">
                  Data-base: <span className="font-medium text-ink">{sindicatoSelecionado.dataBase}</span>
                  {sindicatoSelecionado.observacoes && (
                    <span className="ml-2 text-faint">· {sindicatoSelecionado.observacoes}</span>
                  )}
                </p>
              )}
              {sindicatos.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum sindicato cadastrado. Acesse Sindical/CCT → Sindicatos para cadastrar.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Última CCT (ano)</label>
                <input className="input" type="number" value={sindical.ultimaCct}
                  onChange={e => setSind('ultimaCct', Number(e.target.value))}
                  placeholder="Ex: 2026" />
              </div>
              <div>
                <div onClick={() => setSind('reajusteAplicado', !sindical.reajusteAplicado)}
                  className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors mt-5">
                  <span className="text-sm font-medium text-ink">Reajuste já aplicado?</span>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${sindical.reajusteAplicado ? 'bg-ink' : 'bg-border2'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${sindical.reajusteAplicado ? 'translate-x-4' : 'translate-x-0.5'}`}
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        <div className="card">
          <div className="card-header"><span className="card-title">Observações / Particularidades</span></div>
          <div className="p-5">
            <textarea className="input h-20 resize-y py-2 leading-relaxed"
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              placeholder="Ex: cliente envia ponto atrasado · empresa possui comissão variável..." />
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>
        )}

        <div className="flex gap-3 pb-6">
          <button type="submit" disabled={salvando}
            className="btn btn-primary text-sm px-5 py-2.5">
            {salvando
              ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              : isEdicao ? 'Salvar alterações' : 'Cadastrar empresa'}
          </button>
          <button type="button" onClick={() => navigate('/empresas')} className="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
