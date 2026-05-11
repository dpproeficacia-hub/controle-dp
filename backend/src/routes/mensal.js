const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { status, responsavelId } = req.query;

    const whereEmpresa = { ativa: true, saiuDoEscritorio: false };
    if (req.user.nivel === 'OPERADOR') whereEmpresa.responsavelId = req.user.id;
    else if (responsavelId) whereEmpresa.responsavelId = responsavelId;

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      include: {
        responsavel: { select: { id: true, nome: true } },
        filiais: true,
        gruposTarefa: {
          where: { ativo: true },
          include: { subtarefas: { where: { ativa: true } } }
        },
        historicos: {
          where: { competencia },
          include: { entregasGrupo: { include: { subtarefas: true } } }
        }
