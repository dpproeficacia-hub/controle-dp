import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmtMoeda = v => v ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '';
const parseMoeda = v => parseFloat(v.replace(/[^\d,]/g,'').replace(',','.')) || null;
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');

export default function EmpresaDetalhe() {
  const { empresaId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isGestor } = useAuth();
  const competencia = state?.competencia || new Date().toISOString().slice(0,7);

  const [empresa, setEmpresa] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [tarefasExtras, setTarefasExtras] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [adicionandoTarefa, setAdicionandoTarefa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [semMovimentoMes, setSemMovimentoMes] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/empresas/${empresaId}`),
      api.get(`/mensal/${competencia}/${empresaId}`),
      api.get(`/tarefas/${empresaId}`)
    ]).then(([e, h, t]) => {
      setEmpresa(e.data);
      setHistorico(h.data);
      setTarefasExtras(t.data);
      // Se já foi salvo como sem movimento mas a empresa é pró-labore, ativa o toggle
      if (e.data.temProLabore && !e.data.temFuncionarios && h.data.semMovimentoMes) {
        setSemMovimentoMes(true);
      }
    });
  }, [empresaId, competencia]);

  function toggle(campo) {
    setHistorico(h => ({ ...h, [campo]: !h[campo] }));
    setSalvo(false);
  }

  function setValor(campo, valor) {
    setHistorico(h => ({ ...h, [campo]: valor }));
    setSalvo(false);
  }

  function toggleSemMovimentoMes(val) {
    setSemMovimentoMes(val);
    // Limpa campos de pró-labore ao ativar sem movimento
    if (val) {
      setHistorico(h => ({
        ...h,
        proLaboreOk: false,
        inssOk: false,
        fgtsOk: false,
        valorInss: null,
        valorFgts: null,
        semMovimentoOk: false,
      }));
    } else {
      setHistorico(h => ({ ...h, semMovimentoOk: false }));
    }
    setSalvo(false);
  }

  function toggleTarefaExtra(tarefaId) {
    setHistorico(h => ({
      ...h,
      tarefasOk: h.tarefasOk
        ? h.tarefasOk.map(t => t.tarefaId === tarefaId ? { ...t, ok: !t.ok } : t)
        : [{ tarefaId, ok: true }]
    }));
    setSalvo(false);
  }

  function isTarefaOk(tarefaId) {
    if (!historico?.tarefasOk) return false;
    co
