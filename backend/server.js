require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./src/routes/auth');
const empresasRoutes = require('./src/routes/empresas');
const mensalRoutes = require('./src/routes/mensal');
const sindicalRoutes = require('./src/routes/sindical');
const responsaveisRoutes = require('./src/routes/responsaveis');
const dashboardRoutes = require('./src/routes/dashboard');
const tarefasRoutes = require('./src/routes/tarefas');

const app = express();
const prisma = new PrismaClient();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://controle-dp-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Setup ────────────────────────────────────────────────────────────────────
app.get('/setup', async (req, res) => {
  try {
    const existe = await prisma.usuario.findUnique({ where: { email: 'admin@dpsmart.com' } });
    if (existe) return res.json({ ok: false, msg: 'Admin já existe.' });
    const senha = await bcrypt.hash('Admin@123', 10);
    await prisma.usuario.create({ data: { nome: 'Administrador', email: 'admin@dpsmart.com', senha, nivel: 'ADMIN' } });
    res.json({ ok: true, msg: 'Admin criado!' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/mensal', mensalRoutes);
app.use('/api/sindical', sindicalRoutes);
app.use('/api/responsaveis', responsaveisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tarefas', tarefasRoutes);

// ─── Error handler (mantém CORS mesmo em 500) ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
