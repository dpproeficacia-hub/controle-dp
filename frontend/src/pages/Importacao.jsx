import { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ENQUADRAMENTOS_VALIDOS = [
  'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL',
  'MEI', 'CEI', 'DOMESTICA', 'PRODUTOR_RURAL', 'PESSOA_FISICA', 'ENTIDADES'
];

function normalizarEnquadramento(valor) {
  if (!valor) return 'SIMPLES_NACIONAL';
  const v = String(valor).trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  if (ENQUADRAMENTOS_VALIDOS.includes(v)) return v;
  if (v.includes('PRESUMIDO'))  return 'LUCRO_PRESUMIDO';
  if (v.includes('REAL'))       return 'LUCRO_REAL';
  if (v.includes('SIMPLES') || v === 'SIM') return 'SIMPLES_NACIONAL';
  if (v === 'MEI')              return 'MEI';
  if (v === 'CEI')              return 'CEI';
  if (v.includes('DOMESTIC'))   return 'DOMESTICA';
  if (v.includes('RURAL'))      return 'PRODUTOR_RURAL';
  if (v.includes('FISICA') || v.includes('FISICO')) return 'PESSOA_FISICA';
  if (v.includes('ENTIDADE') || v.includes('ASSOCIA') || v.includes('INSTITU') || v.includes('FUNDAC')) return 'ENTIDADES';
  return null; // retorna null se não reconheceu
}

function normalizarDoc(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  let s = String(raw).trim();
  if (/e\+/i.test(s)) {
    try { s = BigInt(Math.round(Number(s))).toString(); } catch { s = Math.round(Number(s)).toString(); }
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return digits.padStart(11, '0');
  if (digits.length === 13) return digits.padStart(14, '0');
  return digits;
}

function detectarTipoDocumento(digits) {
  if (digits.length === 11) return 'CPF';
  if (digits.length === 12) return 'CEI';
  if (digits.length === 14) return 'CNPJ';
  return null;
}

const PILL_ENQ = {
  SIMPLES_NACIONAL: 'bg-green-100 text-green-800',
  LUCRO_PRESUMIDO:  'bg-blue-100 text-blue-800',
  LUCRO_REAL:       'bg-purple-100 text-purple-800',
  MEI:              'bg-teal-100 text-teal-800',
  CEI:              'bg-orange-100 text-orange-800',
  DOMESTICA:        'bg-pink-100 text-pink-800',
  PRODUTOR_RURAL:   'bg-lime-100 text-lime-800',
  PESSOA_FISICA:    'bg-gray-100 text-gray-800',
  ENTIDADES:        'bg-indigo-100 text-indigo-800',
};

const LABEL_ENQ = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO:  'Lucro Presumido',
  LUCRO_REAL:       'Lucro Real',
  MEI:              'MEI',
  CEI:              'CEI',
  DOMESTICA:        'Doméstica',
  PRODUTOR_RURAL:   'Produtor Rural',
  PESSOA_FISICA:    'Pessoa Física',
  ENTIDADES:        'Entidades',
};

export default function Importacao() {
  const { isAdmin } = useAuth();
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [alertas, setAlertas] = useState([]);
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
    setAlertas([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary', cellText: true, cellDates: false, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

        const empresas = [];
        const problemas = [];
        const docsVistos = {}; // para detectar duplicatas

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const linhaNumero = idx + 1; // número real na planilha
          const razao = String(row[0] || '').trim();
          const docRaw = row[1];
          const enquadramentoRaw = row[2];

          if (!razao || !docRaw) continue;

          // Ignora linhas de cabeçalho/instrução
          const razaoLower = razao.toLowerCase();
          if (
            razaoLower.includes('razão') || razaoLower.includes('razao') ||
            razaoLower.includes('exemplo') || razaoLower.includes('modelo') ||
            razaoLower.startsWith('preencha') || razao.startsWith('  ') ||
            razaoLower.includes('obrigatório') || razaoLower.includes('opcional')
          ) continue;

          const docNormalizado = normalizarDoc(docRaw);
          const tipoDocumento = detectarTipoDocumento(docNormalizado);
          const enquadramento = normalizarEnquadramento(enquadramentoRaw);

          const errosLinha = [];

          // Valida documento
          if (!docNormalizado || docNormalizado.length < 8) {
            errosLinha.push(`Documento inválido ou vazio`);
          } else if (!tipoDocumento) {
            errosLinha.push(`Documento com ${docNormalizado.length} dígitos — esperado 11 (CPF), 12 (CEI/CNO) ou 14 (CNPJ)`);
          }

          // Valida enquadramento
          if (enquadramentoRaw && !enquadramento) {
            errosLinha.push(`Enquadramento "${enquadramentoRaw}" não reconhecido`);
          }

          // Verifica duplicata na própria planilha
          if (docNormalizado && tipoDocumento) {
            if (docsVistos[docNormalizado]) {
              errosLinha.push(`CNPJ/CPF duplicado com a linha ${docsVistos[docNormalizado]}`);
            } else {
              docsVistos[docNormalizado] = linhaNumero;
            }
          }

          if (errosLinha.length > 0) {
            problemas.push({
              linha: linhaNumero,
              razao: razao.slice(0, 50),
              doc: String(docRaw).slice(0, 20),
              erros: errosLinha
            });
            // Não adiciona ao preview se tem erro crítico de documento
            if (!tipoDocumento) continue;
          }

          if (tipoDocumento) {
            empresas.push({
              linha: linhaNumero,
              razaoSocial: razao,
              cnpj: docNormalizado,
              tipoDocumento,
              enquadramento: enquadramento || 'SIMPLES_NACIONAL',
              enquadramentoOriginal: enquadramentoRaw ? String(enquadramentoRaw).trim() : '',
            });
          }
        }

        setPreview(empresas);
        setAlertas(problemas);

        if (empresas.length === 0 && problemas.length === 0) {
          setErro('Nenhuma empresa válida encontrada. Verifique se os dados estão a partir da linha 16.');
        }
      } catch (err) {
        setErro('Erro ao ler o arquivo: ' + err.message);
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
          tipoDocumento: emp.tipoDocumento,
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
        if (msg.includes('Unique') || msg.includes('already') || msg.includes('unique')) {
          ignoradas++;
          erros.push({ linha: emp.linha, empresa: emp.razaoSocial, erro: 'Já existe no sistema (documento duplicado)' });
        } else {
          erros.push({ linha: emp.linha, empresa: emp.razaoSocial, erro: msg });
          ignoradas++;
        }
      }
      setProgresso(Math.round(((i + 1) / preview.length) * 100));
    }

    setResultado({ criadas, ignoradas, erros });
    setImportando(false);
  }

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

      <div className="max-w-3xl space-y-4">
        <div className="card p-6">
          <p className="card-title mb-4">1. Selecione o arquivo</p>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border2 rounded-xl cursor-pointer hover:border-ink hover:bg-surface2 transition-all">
            <div className="text-center">
              <p className="text-sm font-medium text-ink">
                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-faint mt-1">
                {arquivo
                  ? `${preview.length} válidos${alertas.length > 0 ? ` · ${alertas.length} com problema` : ''}`
                  : 'Formato aceito: .xlsx'}
              </p>
            </div>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={processarArquivo} />
          </label>
          {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
        </div>

        {/* Painel de alertas — linhas com problema */}
        {alertas.length > 0 && (
          <div className="card overflow-hidden border-2 border-amber-200">
            <div className="card-header bg-amber-50">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold text-sm">⚠️ {alertas.length} linha(s) com problema</span>
                <span className="text-xs text-amber-600">— corrija na planilha e reimporte</span>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-amber-50 sticky top-0">
                  <tr>
                    {['Linha', 'Empresa', 'Documento encontrado', 'Problema'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-amber-700 border-b border-amber-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a, i) => (
                    <tr key={i} className="border-b border-amber-100 last:border-b-0 bg-white">
                      <td className="px-3 py-2">
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">L{a.linha}</span>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-ink max-w-[200px] truncate">{a.razao}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted">{a.doc}</td>
                      <td className="px-3 py-2">
                        {a.erros.map((err, j) => (
                          <p key={j} className="text-xs text-red-600">{err}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prévia das válidas */}
        {preview.length > 0 && !resultado && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title">2. Prévia — {preview.length} registros válidos</span>
              <span className="pill pill-blue">{preview.length} para importar</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-surface2 sticky top-0">
                  <tr>
                    {['Linha', 'Nome / Razão Social', 'Documento', 'Enquadramento'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((emp, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface2">
                      <td className="px-3 py-2">
                        <span className="text-[10px] text-faint">L{emp.linha}</span>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-ink">{emp.razaoSocial.slice(0, 45)}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-semibold text-faint mr-1">{emp.tipoDocumento}</span>
                        <span className="text-xs font-mono text-muted">{emp.cnpj}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PILL_ENQ[emp.enquadramento]}`}>
                          {LABEL_ENQ[emp.enquadramento]}
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
                  : `Importar ${preview.length} registros`}
              </button>
            </div>
          </div>
        )}

        {importando && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink">Importando...</span>
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
                <p className="text-xs text-green-600 mt-1">Criados com sucesso</p>
              </div>
              <div className="bg-surface2 border border-border rounded-lg p-3 text-center">
                <p className="font-display font-bold text-2xl text-muted">{resultado.ignoradas}</p>
                <p className="text-xs text-faint mt-1">Já existiam ou com erro</p>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden mb-4">
                <div className="bg-red-50 px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-red-700">{resultado.erros.length} registro(s) não importado(s):</p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-surface2 sticky top-0">
                      <tr>
                        {['Linha', 'Empresa', 'Motivo'].map(h => (
                          <th key={h} className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-faint border-b border-border">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.erros.map((e, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-1.5">
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">L{e.linha}</span>
                          </td>
                          <td className="px-3 py-1.5 text-xs text-ink max-w-[200px] truncate">{e.empresa}</td>
                          <td className="px-3 py-1.5 text-xs text-red-600">{e.erro}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button onClick={() => { setArquivo(null); setPreview([]); setResultado(null); setAlertas([]); }}
              className="btn btn-secondary text-xs">
              Importar outro arquivo
            </button>
          </div>
        )}

        <div className="card p-5">
          <p className="card-title mb-3">Como usar</p>
          <div className="space-y-2 text-sm text-muted">
            <p>1. Coluna A: <strong className="text-ink">Razão Social / Nome</strong></p>
            <p>2. Coluna B: <strong className="text-ink">Documento</strong> — CNPJ (14), CPF (11), CEI/CNO (12 dígitos)</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">⚠️ Se colar de outra planilha, formate a coluna B como <strong>Texto</strong> antes de colar</p>
            </div>
            <p>3. Coluna C: <strong className="text-ink">Enquadramento</strong> — opcional, aceita com ou sem acento</p>
            <p>4. O sistema mostra os problemas <strong className="text-ink">antes de importar</strong> com a linha exata</p>
          </div>
        </div>
      </div>
    </div>
  );
}
