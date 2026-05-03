const express = require('express');
const cors    = require('cors');
const routes  = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const config  = require('./config/environment');

const app  = express();
const PORT = config.port;

// ── Middlewares globais ─────────────────────────────────────
app.use(cors(config.cors));
app.use(express.json());

// ── Rotas ───────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => res.json({ 
  status: 'API Academic rodando ✅',
  ambiente: config.nodeEnv,
}));

// ── Tratamento de rota não encontrada ────────────────────────
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// ── Middleware de erro (DEVE ser por último!) ────────────────
app.use(errorHandler);

// ── Inicia servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📦 Ambiente: ${config.nodeEnv}`);
});
