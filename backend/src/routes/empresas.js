const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { responsavelId, nivel, tipo, semMovimento, temFuncionarios, temProLabore, enviaReinf, fatorR, incluirSaiu } = req.query;
  const where = { ativa: true };
  if (req.user.nivel === 'OPERADOR') {
    where.responsavelId = req.user.id;
    where.saiuDoEscritorio = false;
  } else {
    if (!incluirSaiu || incluirSaiu === 'false') where.saiuDoEscritorio = false;
    if (responsavelId) where.responsavelId = responsavelId;
  }
  if (nivel) where.nivel = nivel;
  if (tipo) where.tipo = tipo;
  if (semMovimento !== undefined) where.semMovimento = semMovimento === 'true';
  if (temFuncionarios !== undefined) where.temFuncionarios = temFuncionarios === 'true';
  if (temProLabore !== undefined) where.temProLabore = temProLabore === 'true';
  if (enviaReinf !== undefined) where.enviaReinf = enviaReinf === 'true';
  if (fatorR !== undefined) where.fatorR = fatorR === 'true';
  const empresas = await prisma.empresa.findMany({
    where,
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true },
    orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
  });
  res.json(empresas);
});

router.get('/:id', async (req, res) => {
  const empresa = await prisma.empresa.findUnique({
    where: { id: req.params.id },
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true }
  });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(empresa);
});

router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const {
    razaoSocial, cnpj, enquadramento, tipo, nivel, prazoEntrega,
    temFuncionarios, temProLabore, semMovimento, temFilial,
    fatorR, enviaReinf, observacoes, responsavelId
  } = req.body;
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const empresa = await prisma.empresa.create({
    data: {
      razaoSocial, cnpj: cnpjLimpo, enquadramento, tipo,
      nivel: nivel || 'N3',
      prazoEntrega, temFuncionarios, temProLabore, semMovimento,
      temFilial, fatorR, enviaReinf, observacoes, responsavelId,
    },
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true }
  });
  res.status(201).json(empresa);
});

// Upload em lote (TXT ou Excel)
router.post('/upload-lote', requireNivel('GESTOR', 'ADMIN'), upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let linhas = [];

    if (ext === 'txt' || ext === 'csv') {
      // TXT: cada linha = "RAZAO SOCIAL;CNPJ" ou "RAZAO SOCIAL,CNPJ"
      const texto = req.file.buffer.toString('utf-8');
      linhas = texto.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => {
          const sep = l.includes(';') ? ';' : ',';
          const partes = l.split(sep).map(p => p.trim());
          return { razaoSocial: partes[0], cnpj: partes[1] };
        });
    } else if (ext === 'xlsx' || ext === 'xls') {
      // Excel: colunas "razaoSocial" e "cnpj" (ou "Razão Social" e "CNPJ")
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const dados = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      linhas = dados.map(row => {
        const razaoSocial =
          row['razaoSocial'] || row['Razão Social'] || row['Razao Social'] ||
          row['RAZAO SOCIAL'] || row['razao_social'] || '';
        const cnpj =
          row['cnpj'] || row['CNPJ'] || row['Cnpj'] || '';
        return { razaoSocial: String(razaoSocial).trim(), cnpj: String(cnpj).trim() };
      });
    } else {
      return res.status(400).json({ error: 'Formato inválido. Use .txt, .csv, .xlsx ou .xls' });
    }

    const resultados = { criadas: 0, duplicadas: 0, erros: [] };

    for (const linha of linhas) {
      if (!linha.razaoSocial || !linha.cnpj) continue;
      const cnpjLimpo = linha.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        resultados.erros.push(`CNPJ inválido: "${linha.cnpj}" (${linha.razaoSocial})`);
        continue;
      }
      const existe = await prisma.empresa.findFirst({ where: { cnpj: cnpjLimpo } });
      if (existe) {
        resultados.duplicadas++;
        continue;
      }
      await prisma.empresa.create({
        data: {
          razaoSocial: linha.razaoSocial,
          cnpj: cnpjLimpo,
          enquadramento: 'SIMPLES_NACIONAL',
          tipo: 'OUTROS',
          nivel: 'N3',
          temFuncionarios: false,
          temProLabore: false,
          semMovimento: true,
          temFilial: false,
          fatorR: false,
          enviaReinf: false,
        }
      });
      resultados.criadas++;
    }

    res.json(resultados);
  } catch (e) {
    console.error('Upload lote erro:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { sindical, filiais, ...dados } = req.body;
  if (dados.cnpj) dados.cnpj = dados.cnpj.replace(/\D/g, '');
  const empresa = await prisma.empresa.update({
    where: { id: req.params.id },
    data: dados,
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true }
  });
  res.json(empresa);
});

router.patch('/:id/saiu', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { saiuDoEscritorio } = req.body;
  const empresa = await prisma.empresa.update({
    where: { id: req.params.id },
    data: { saiuDoEscritorio }
  });
  res.json(empresa);
});

router.delete('/:id', requireNivel('ADMIN'), async (req, res) => {
  await prisma.empresa.update({ where: { id: req.params.id }, data: { ativa: false } });
  res.json({ ok: true });
});

module.exports = router;
