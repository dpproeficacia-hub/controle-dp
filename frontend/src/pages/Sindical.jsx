import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [controles, setControles] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('cct');
  const { isGestor } = useAuth();
  const anoAtual = new Date().getFullYear();

  const [formCCT, setFormCCT] = useState({ empresaId: '', sindicatoId: '', ultimaCct: anoAtual, reajusteAplicado: false });
  const [mostraFormCCT, setMostraFormCCT] = useState(false);
  const [salvandoCCT, setSalvandoCCT] = useState(false);

  const [formSind, setFormSind] = useState({ nome: '', dataBase: '', observacoes: '' });
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [mostraFormSind, setMostraFormSind] = useState(false);
  const [editandoSind, setEditandoSind] = useState(null);
  const [salvandoSind, setSalvandoSind] = useState(false);
  const [buscaEmpresa, setBuscaEmpresa] = useState('');

  useEffect(() => {
    carregar();
    // Carrega TODAS as empresas (sem filtro de funcionários)
    api.get('/empresas').then(r => setTodasEmpresas(r.data));
  }, []);

  function carregar() {
    setLoading(true);
    Promise.all([
      api.get('/sindical'),
      api.get('/sindical/sindicatos')
    ]).then(([c, s]) => {
      setControles(c.data);
      setSindicatos(s.data);
    }).finally(() => setLoading(false));
  }

  async function salvarCCT(e) {
    e.preventDefault();
    setSalvandoCCT(true);
    try {
      await api.put(`/sindical/${formCCT.empresaId}`, {
        sindicatoId: formCCT.sindicatoId,
        ultimaCct: Number(formCCT.ultimaCct),
        reajusteAplicado: formCCT.reajusteAplicado
      });
      setMostraFormCCT(false);
      setFormCCT({ empresaId: '', sindicatoId: '', ultimaCct: anoAtual, reajusteAplicado: false });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvandoCCT(false);
    }
  }

  function editarCCT(c) {
    setFormCCT({
      empresaId: c.empresaId,
      sindicatoId: c.sindicatoId || '',
      ultimaCct: c.ultimaCct,
      reajusteAplicado: c.reajusteAplicado
    });
    setMostraFormCCT(true);
    window.scrollTo(0, 0);
  }

  async function salvarSindicato(e) {
    e.preventDefault();
    setSalvandoSind(true);
    try {
      if (editandoSind) {
        await api.p
