require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { corsMiddleware } = require('./src/middleware/auth');

const authRoutes = require('./src/routes/auth');
const empresasRoutes = require('./src/routes/empresas');
const mensalRoutes = require('./src/routes/mensal');
const sindicalRoutes = require('./src/routes/sindical');
const responsaveisRoutes = require('./src/routes/responsaveis');
const dashboardRoutes = require('./src/routes/dashboard');
const tarefasRoutes = require('./src/routes/tarefas');

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], optionsSuccessStatus: 200 }));
app.options('*', (req, res) => { res.header('Access-Control-Allow-Origin','*'); res.header('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS'); res.header('Access-Control-Allow-Headers','Content-Type,Authorization'); res.sendStatus(200); });
app.use(corsMiddleware);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', cors: 'enabled' }));

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

app.use('/api/auth', corsMiddleware, authRoutes);
app.use('/api/empresas', corsMiddleware, empresasRoutes);
app.use('/api/mensal', corsMiddleware, mensalRoutes);
app.use('/api/sindical', corsMiddleware, sindicalRoutes);
app.use('/api/responsaveis', corsMiddleware, responsaveisRoutes);
app.use('/api/dashboard', corsMiddleware, dashboardRoutes);
app.use('/api/tarefas', corsMiddleware, tarefasRoutes);

app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Erro interno' }); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
