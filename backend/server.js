require('dotenv').config();
const express = require('express');
const { execSync } = require('child_process');

const authRoutes         = require('./src/routes/auth');
const empresasRoutes     = require('./src/routes/empresas');
const mensalRoutes       = require('./src/routes/mensal');
const sindicalRoutes     = require('./src/routes/sindical');
const responsaveisRoutes = require('./src/routes/responsaveis');
const dashboardRoutes    = require('./src/routes/dashboard');
const gruposRoutes       = require('./src/routes/grupos');
const agendaRoutes       = require('./src/routes/agenda');
const notificacoesRoutes = require('./src/routes/notificacoes');
const feriadosRoutes     = require('./src/routes/feriados');
const escritorioRoutes   = require('./src/routes/escritorio');

const app = express();

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

app.use(express.json({ limit: '10mb' })); // aumenta limite para suportar logo em base64

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',         authRoutes);
app.use('/api/empresas',     empresasRoutes);
app.use('/api/mensal',       mensalRoutes);
app.use('/api/sindical',     sindicalRoutes);
app.use('/api/responsaveis', responsaveisRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/grupos',       gruposRoutes);
app.use('/api/agenda',       agendaRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/feriados',     feriadosRoutes);
app.use('/api/escritorio',   escritorioRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
