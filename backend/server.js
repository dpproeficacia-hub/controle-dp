require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const authRoutes = require('./src/routes/auth');
const empresasRoutes = require('./src/routes/empresas');
const mensalRoutes = require('./src/routes/mensal');
const sindicalRoutes = require('./src/routes/sindical');
const responsaveisRoutes = require('./src/routes/responsaveis');
const dashboardRoutes = require('./src/routes/dashboard');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));

app.options('*', cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

app.get('/setup', async (req, res) => {
  try {
    const existe = await prisma.usuario.findUnique({ where: { email: 'admin@dpsmart.com' } });
    if (existe) return res.json({ ok: false, msg: 'Admin já existe. Faça login normalmente.' });
    const senha = await bcrypt.hash('Admin@123', 10);
    await prisma.usuario.create({
      data: { nome: 'Administrador', email: 'admin@dpsmart.com', senha, nivel: 'ADMIN' }
    });
    res.json({ ok: true, msg: 'Admin criado! Email: admin@dpsmart.com / Senha: Admin@123' });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/mensal', mensalRoutes);
app.use('/api/sindical', sindicalRoutes);
app.use('/api/responsaveis', responsaveisRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`DPSmart API rodando na porta ${PORT}`));
