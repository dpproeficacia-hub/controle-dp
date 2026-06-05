require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const authRoutes = require('./src/routes/auth');
const empresasRoutes = require('./src/routes/empresas');
const mensalRoutes = require('./src/routes/mensal');
const sindicalRoutes = require('./src/routes/sindical');
const responsaveisRoutes = require('./src/routes/responsaveis');
const dashboardRoutes = require('./src/routes/dashboard');
const gruposRoutes = require('./src/routes/grupos');
const agendaRoutes = require('./src/routes/agenda');

const app = express();
const prisma = new PrismaClient();

// Roda migrations automaticamente ao iniciar
try {
  console.log('Rodando migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Migrations concluídas.');
} catch (e) {
  console.error('Erro nas migrations:', e.message);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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

app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/mensal', mensalRoutes);
app.use('/api/sindical', sindicalRoutes);
app.use('/api/responsaveis', responsaveisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/agenda', agendaRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
