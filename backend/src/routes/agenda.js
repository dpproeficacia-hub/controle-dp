const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const DIAS_ATE_EXCLUIR = 30;

router.use(authMiddleware);

// Remove eventos concluídos há mais de 30 dias — roda silenciosamente antes de listar
async function limparEventosAntigos() {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_ATE_EXCLUIR);
  try {
    await prisma.eventoAgenda.deleteMany({
      where: {
        concluido: true,
        dataConclusao: { lte: limite }
      }
    });
  } catch (e) {
    console.error('Erro ao limpar eventos antigos da agenda:', e.message);
  }
}

// Listar eventos do usuário logado (ou de outro usuário se gestor/admin)
router.get('/', async (req, res) => {
  try {
    await limparEventosAntigos();

    const { usuarioId, concluido } = req.query;

    let targetUserId = req.user.id;

    if (usuarioId && (req.user.nivel === 'GESTOR' || req.user.nivel === 'ADMIN')) {
      targetUserId = usuarioId;
    }

    const where = { usuarioId: targetUserId };
    if (concluido !== undefined) where.concluido = concluido === 'true';

    const eventos = await prisma.eventoAgenda.findMany({
      where,
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } }
      },
      orderBy: [{ concluido: 'asc' }, { dataInicio: 'asc' }]
    });

    res.json(eventos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Contar notificações pendentes do usuário logado
router.get('/notificacoes', async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const count = await prisma.eventoAgenda.count({
      where: {
        usuarioId: req.user.id,
        concluido: false,
        dataInicio: { lte: new Date() }
      }
    });

    res.json({ total: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar evento
router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, dataInicio, dataLimite, empresaId } = req.body;

    const evento = await prisma.eventoAgenda.create({
      data: {
        titulo,
        descricao: descricao || null,
        dataInicio: new Date(dataInicio),
        dataLimite: dataLimite ? new Date(dataLimite) : null,
        empresaId: empresaId || null,
        usuarioId: req.user.id,
      },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } }
      }
    });

    res.status(201).json(evento);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Concluir evento
router.patch('/:id/concluir', async (req, res) => {
  try {
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: req.params.id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.usuarioId !== req.user.id && req.user.nivel === 'OPERADOR') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const atualizado = await prisma.eventoAgenda.update({
      where: { id: req.params.id },
      data: { concluido: true, dataConclusao: new Date() },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } }
      }
    });

    res.json(atualizado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reabrir evento
router.patch('/:id/reabrir', async (req, res) => {
  try {
    const atualizado = await prisma.eventoAgenda.update({
      where: { id: req.params.id },
      data: { concluido: false, dataConclusao: null },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } }
      }
    });
    res.json(atualizado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Editar evento
router.put('/:id', async (req, res) => {
  try {
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: req.params.id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.usuarioId !== req.user.id && req.user.nivel === 'OPERADOR') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const { titulo, descricao, dataInicio, dataLimite, empresaId } = req.body;
    const atualizado = await prisma.eventoAgenda.update({
      where: { id: req.params.id },
      data: {
        titulo,
        descricao: descricao || null,
        dataInicio: new Date(dataInicio),
        dataLimite: dataLimite ? new Date(dataLimite) : null,
        empresaId: empresaId || null,
      },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } }
      }
    });

    res.json(atualizado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir evento
router.delete('/:id', async (req, res) => {
  try {
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: req.params.id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.usuarioId !== req.user.id && req.user.nivel === 'OPERADOR') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    await prisma.eventoAgenda.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar usuários para o gestor/admin ver agenda de outros
router.get('/usuarios', async (req, res) => {
  try {
    if (req.user.nivel === 'OPERADOR') return res.status(403).json({ error: 'Sem permissão' });
    const usuarios = await prisma.usuario.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, nivel: true }
    });
    res.json(usuarios);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
