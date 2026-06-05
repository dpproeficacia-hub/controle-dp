import { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ENQUADRAMENTOS_VALIDOS = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'];

function normalizarEnquadramento(valor) {
  if (!valor) return 'SIMPLES_NACIONAL';
  const v = String(valor).trim().toUpperCase()
    .replace(/\s+/g, '_')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (ENQUADRAMENTOS_VALIDOS.includes(v)) return v;
  // Tentativa de correspondência parcial
  if (v.includes('PRESUMIDO')) return 'LUCRO_PRESUMIDO';
  if (v.includes('REAL')) return 'LUCRO_REAL';
  if (v.includes('SIMPLES')) return 'SIMPLES_NACIONAL';
  return 'SIMPLES_NACIONAL'; // padrão
}

export default function Importacao() {
  const { isAdmin } = useAuth();
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState(0);

  function processarArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setArquivo(file);
    setResultado(null);
    setErro('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const empresas = [];
        for (const row of rows) {
          const razao = String(row[0] || '').trim();
          const cnpjRaw = String(row[1] || '').trim();
          const cnpj = cnpjRaw.replace(/\D/g, '');
          const enquadramentoRaw = row[2];

          // Ignora linhas sem razão social e CNPJ válido
          if (!razao || cnpj.length !== 14) continue;
          // Ignora linhas de cabeçalho ou exemplo
          if (razao.toLowerCase().includes('razão') || razao.toLowerCase().includes('razao')) continue;
          if (razao.toLowerCase().includes('exemplo') || razao.toLowerCase().includes('modelo')) continue;

          empresas.push({
            razaoSocial: razao,
            cnpj,
            enquadramento: normalizarEnquadramento(enquadramentoRaw),
            enquadramentoOriginal: enquadramentoRaw ? String(enquadramentoRaw).trim() : '',
          });
        }

        setPreview(empresas);
      } catch {
        setErro('Erro ao ler o arquivo. Verifique se é um .xlsx válido.');
      }
    };
    reader.readAsBinaryString(file);
  }

  async function importar() {
    if (!preview.length) return;
    setImportando(true);
    setResultado(null);
    setErro('');
    setProgresso(0);

    let criadas = 0;
    let ignoradas = 0;
    const erros = [];

    for (let i = 0; i < preview.length; i++) {
      const emp = preview[i];
      try {
        await api.post('/empresas', {
          razaoSocial: emp.razaoSocial,
          cnpj: emp.cnpj,
          enquadramento: emp.enquadramento,
          tipo: 'OUTROS',
          nivel: 'N3',
          temFuncionarios: false,
          temProLabore: false,
          semMovimento: false,
          temFilial: false,
          fatorR: false,
          enviaReinf: false,
        });
        criadas++;
      } catch (e) {
        const msg = e.response?.data?.error || e.message;
        if (msg.includes('Unique') || msg.includes('already')) {
          ignoradas++;
        } else {
          erros.push({ empresa: emp.razaoSocial, erro: msg });
          ignoradas++;
        }
      }
      setProgresso(Math.round(((i + 1) / preview.length) * 100));
    }

    setResultado({ criadas, ignoradas, erros });
    setImportando(false);
  }

  const PILL_ENQ = {
    SIMPLES_NACIONAL: 'bg-green-100 text-green-800',
    LUCRO_PRESUMIDO: 'bg-blue-100 text-blue-800',
    LUCRO_REAL: 'bg-purple-100 text-purple-800',
  };

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-48 text-muted text-sm">
      Acesso restrito ao administrador.
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-bold text-lg text-ink">Importação de Empresas</h2>
        <p className="text-sm text-muted mt-0.5">Importe empresas em lote a partir do arquivo Excel</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="card p-6">
          <p className="card-title mb-4">1. Selecione o arquivo</p>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border2 rounded-xl cursor-pointer hover:border-ink hover:bg-surface2 transition-all">
            <div className="text-center">
              <p className="text-sm font-medium text-ink">
                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-faint mt-1">
                {arquivo ? `${preview.length} empresas encontradas` : 'Formato aceito: .xlsx'}
              </p>
            </div>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={processarArquivo} />
          </label>
          {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
        </div>

        {preview.length > 0 && !resultado && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title">2. Prévia — {preview.length} empresas</span>
              <span className="pill pill-blue">{preview.length} para importar</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-surface2 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">#</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">Razão Social</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">CNPJ</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">Enquadramento</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((emp, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface2">
                      <td className="px-4 py-2 text-xs text-faint">{i + 1}</td>
                      <td className="px-4 py-2 text-xs font-medium text-ink">{emp.razaoSocial}</td>
                      <td className="px-4 py-2 text-xs font-mono text-muted">
                        {emp.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PILL_ENQ[emp.enquadramento]}`}>
                          {emp.enquadramento.replace(/_/g, ' ')}
                        </span>
                        {!emp.enquadramentoOriginal && (
                          <span className="text-[10px] text-faint ml-1">(padrão)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface2">
              <p className="text-xs text-faint">Tipo: Outros · Nível N3 · demais campos editáveis depois</p>
              <button onClick={importar} disabled={importando} className="btn btn-primary">
                {importando
                  ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin mr-2" />Importando...</>
                  : `Importar ${preview.length} empresas`}
              </button>
            </div>
          </div>
        )}

        {importando && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink">Importando empresas...</span>
              <span className="text-sm font-bold text-ink">{progresso}%</span>
            </div>
            <div className="progress-bar h-3">
              <div className="progress-fill h-3" style={{ width: `${progresso}%`, background: '#185FA5' }} />
            </div>
            <p className="text-xs text-faint mt-2">Não feche esta página</p>
          </div>
        )}

        {resultado && (
          <div className="card p-5">
            <p className="font-display font-bold text-lg text-ink mb-3">
              {resultado.erros.length === 0 ? '✅ Importação concluída!' : '⚠️ Concluída com avisos'}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="font-display font-bold text-2xl text-green-700">{resultado.criadas}</p>
                <p className="text-xs text-green-600 mt-1">Empresas criadas</p>
              </div>
              <div className="bg-surface2 border border-border rounded-lg p-3 text-center">
                <p className="font-display font-bold text-2xl text-muted">{resultado.ignoradas}</p>
                <p className="text-xs text-faint mt-1">Já existiam ou com erro</p>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-red-700 mb-1">Erros:</p>
                {resultado.erros.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e.empresa}: {e.erro}</p>
                ))}
              </div>
            )}
            <button onClick={() => { setArquivo(null); setPreview([]); setResultado(null); }} className="btn btn-secondary text-xs">
              Importar outro arquivo
            </button>
          </div>
        )}

        <div className="card p-5">
          <p className="card-title mb-3">Como usar</p>
          <div className="space-y-2 text-sm text-muted">
            <p>1. Baixe o modelo acima e preencha a partir da linha 13</p>
            <p>2. Coluna A: <strong className="text-ink">Razão Social</strong> (obrigatório)</p>
            <p>3. Coluna B: <strong className="text-ink">CNPJ</strong> (obrigatório, com ou sem pontuação)</p>
            <p>4. Coluna C: <strong className="text-ink">Enquadramento</strong> (opcional — use o menu suspenso na planilha)</p>
            <p className="text-xs text-faint pl-3">Se deixar em branco, importa como <strong>Simples Nacional</strong></p>
            <p>5. Selecione o arquivo — o sistema mostra a prévia antes de importar</p>
            <p>6. Após importar, configure cada empresa individualmente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
