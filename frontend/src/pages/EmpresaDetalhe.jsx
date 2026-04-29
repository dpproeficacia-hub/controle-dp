const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function calcularStatus(h, empresa) {
  const campos = [];
  if (empresa.temFuncionarios) campos.push('folhaOk', 'inssOk', 'fgtsOk', 'irOk');
  else if (empresa.temProLabore) campos.push('proLaboreOk', 'inssOk', 'fgtsOk');
  else if (empresa.semMovimento) campos.push('semMovimentoOk');
  const total = campos.length;
  if (total === 0) return 'NAO_INICIADO';
  const feitos = campos.filter(c => h[c]).length;
  if (feitos === 0) return 'NAO_INICIADO';
  if (feitos === total) return 'FINALIZADO';
  return 'PARCIAL';
}

// Campos permitidos no HistoricoMensal
const CAMPOS_HISTORICO = [
  'folhaOk','inssOk','fgtsOk','irOk','proLaboreOk','semMovimentoOk',
  'valorInss','valorFgts','valorIr','dataEntregaFolha','dataEntregaObrig','tarefasOk'
];

function filtrarCampos(dados) {
  return Object.fromEntries(
    Object.entries(dados).filter(([k]) => CAMPOS_HISTORICO.includes(k))
  );
}

// Listar controle mensal por competência
router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { status, responsavelId } = req.qu
