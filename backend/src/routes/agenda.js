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

// Cria (ou recria) o GrupoTarefa vinculado a um evento de agenda
async function criarOuAtualizarTarefaDoEvento(evento, dadosTarefa, usuarioId) {
  const { empresaId, dia, mesVencimento, anoVencimento, isDiaUtil, mesSubsequente } = dadosTarefa;

  // Remove tarefa anterior se existir (caso o usuário esteja editando)
  if (evento.grupoTarefaId) {
    await prisma.grupoTarefa.update({
      where: { id: evento.grupoTarefaId },
      data: { ativo: false }
    }).catch(() => {});
  }

  // PONTUAL: usamos inicioCobrancaEm como o próprio mês de competência,
  // assim a tarefa só aparece naquele mês específico (mensal.js já respeita isso)
  const competenciaEvento = `${anoVencimento}-${String(mesVencimento).padStart(2, '0')}`;

  const grupo = await prisma.grupoTarefa.create({
    data: {
      empresaId,
      nome: evento.titulo,
      diaVencimento: dia,
      isDiaUtil: isDiaUtil || false,
      mesSubsequente: false, // já embutimos o mês certo via inicioCobrancaEm
      tipo: 'PONTUAL',
      inicioCobrancaEm: new Date(`${competenciaEvento}-01`),
    }
  });

  return grupo;
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
        usuario: { select: { id: true, nome: true } },
        grupoTarefa: { select: { id: true, nome: true, diaVencimento: true, isDiaUtil: true } }
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

// Criar evento — agora aceita enviarParaTarefas + dados de vencimento
router.post('/', async (req, res) => {
  try {
    const {
      titulo, descricao, dataInicio, dataLimite, empresaId,
      enviarParaTarefas, diaVencimento, isDiaUtil
    } = req.body;

    if (enviarParaTarefas && !empresaId) {
      return res.status(400).json({ error: 'Selecione uma empresa para enviar a tarefa ao Controle Mensal.' });
    }

    const evento = await prisma.eventoAgenda.create({
      data: {
        titulo,
        descricao: descricao || null,
        dataInicio: new Date(dataInicio),
        dataLimite: dataLimite ? new Date(dataLimite) : null,
        empresaId: empresaId || null,
        usuarioId: req.user.id,
      }
    });

    let grupoTarefa = null;

    if (enviarParaTarefas && empresaId) {
      const baseData = new Date(dataLimite || dataInicio);
      const dia = diaVencimento ? Number(diaVencimento) : baseData.getDate();
      const mesVencimento = baseData.getMonth() + 1;
      const anoVencimento = baseData.getFullYear();

      grupoTarefa = await criarOuAtualizarTarefaDoEvento(evento, {
        empresaId, dia, mesVencimento, anoVencimento, isDiaUtil: isDiaUtil || false
      }, req.user.id);

      await prisma.eventoAgenda.update({
        where: { id: evento.id },
        data: { grupoTarefaId: grupoTarefa.id }
      });
    }

    const eventoCompleto = await prisma.eventoAgenda.findUnique({
      where: { id: evento.id },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } },
        grupoTarefa: { select: { id: true, nome: true, diaVencimento: true, isDiaUtil: true } }
      }
    });

    res.status(201).json(eventoCompleto);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Concluir evento — se tiver tarefa vinculada, marca como entregue também
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
        usuario: { select: { id: true, nome: true } },
        grupoTarefa: true
      }
    });

    // Se há tarefa vinculada, marca a entrega correspondente como concluída também
    if (atualizado.grupoTarefaId && atualizado.empresaId) {
      const grupo = atualizado.grupoTarefa;
      const competencia = grupo.inicioCobrancaEm
        ? `${grupo.inicioCobrancaEm.getUTCFullYear()}-${String(grupo.inicioCobrancaEm.getUTCMonth() + 1).padStart(2, '0')}`
        : null;

      if (competencia) {
        let historico = await prisma.historicoMensal.findUnique({
          where: { empresaId_competencia: { empresaId: atualizado.empresaId, competencia } }
        });
        if (!historico) {
          historico = await prisma.historicoMensal.create({
            data: { empresaId: atualizado.empresaId, competencia, responsavelId: req.user.id }
          });
        }
        await prisma.entregaGrupo.upsert({
          where: { grupoId_historicoId: { grupoId: grupo.id, historicoId: historico.id } },
          create: {
            grupoId: grupo.id, historicoId: historico.id,
            entregue: true, dataEntrega: new Date().toISOString().slice(0, 10)
          },
          update: { entregue: true, dataEntrega: new Date().toISOString().slice(0, 10) }
        });
      }
    }

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
        usuario: { select: { id: true, nome: true } },
        grupoTarefa: { select: { id: true, nome: true } }
      }
    });
    res.json(atualizado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Editar evento — recria a tarefa vinculada se os dados de vencimento mudarem
router.put('/:id', async (req, res) => {
  try {
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: req.params.id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.usuarioId !== req.user.id && req.user.nivel === 'OPERADOR') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const {
      titulo, descricao, dataInicio, dataLimite, empresaId,
      enviarParaTarefas, diaVencimento, isDiaUtil
    } = req.body;

    const atualizado = await prisma.eventoAgenda.update({
      where: { id: req.params.id },
      data: {
        titulo,
        descricao: descricao || null,
        dataInicio: new Date(dataInicio),
        dataLimite: dataLimite ? new Date(dataLimite) : null,
        empresaId: empresaId || null,
      }
    });

    // Se desmarcou "enviar para tarefas", desativa a tarefa vinculada
    if (!enviarParaTarefas && evento.grupoTarefaId) {
      await prisma.grupoTarefa.update({
        where: { id: evento.grupoTarefaId },
        data: { ativo: false }
      });
      await prisma.eventoAgenda.update({ where: { id: evento.id }, data: { grupoTarefaId: null } });
    }

    // Se marcou (ou já estava marcado), recria a tarefa com os dados novos
    if (enviarParaTarefas && empresaId) {
      const baseData = new Date(dataLimite || dataInicio);
      const dia = diaVencimento ? Number(diaVencimento) : baseData.getDate();
      const mesVencimento = baseData.getMonth() + 1;
      const anoVencimento = baseData.getFullYear();

      const grupoTarefa = await criarOuAtualizarTarefaDoEvento(atualizado, {
        empresaId, dia, mesVencimento, anoVencimento, isDiaUtil: isDiaUtil || false
      }, req.user.id);

      await prisma.eventoAgenda.update({
        where: { id: atualizado.id },
        data: { grupoTarefaId: grupoTarefa.id }
      });
    }

    const eventoCompleto = await prisma.eventoAgenda.findUnique({
      where: { id: atualizado.id },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, nome: true } },
        grupoTarefa: { select: { id: true, nome: true, diaVencimento: true, isDiaUtil: true } }
      }
    });

    res.json(eventoCompleto);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir evento — também desativa a tarefa vinculada, se houver
router.delete('/:id', async (req, res) => {
  try {
    const evento = await prisma.eventoAgenda.findUnique({ where: { id: req.params.id } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });
    if (evento.usuarioId !== req.user.id && req.user.nivel === 'OPERADOR') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    if (evento.grupoTarefaId) {
      await prisma.grupoTarefa.update({
        where: { id: evento.grupoTarefaId },
        data: { ativo: false }
      }).catch(() => {});
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
