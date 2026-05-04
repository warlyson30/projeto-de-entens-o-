require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} = require('./auth');

const app = express();
app.use(express.json());

const calendarioRouter = require('./rotas/calendario');
const materiasRouter = require('./rotas/materias');
const lembretesRouter = require('./rotas/lembretes');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'substua_por_uma_chave_secreta_forte';

const USERS = [
  { id: 1, username: 'joão', passwordHash: bcrypt.hashSync('1234', 10), name: 'João da Silva' },
];

async function findUser(username, password) {
  const user = USERS.find((u) => u.username === username);
  if (!user) return null;

  const senhaCorreta = await bcrypt.compare(password, user.passwordHash);
  return senhaCorreta ? user : null;
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: 'Informe usuário e senha.' });
  }

  const user = await findUser(username, password);

  if (!user) {
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return res.json({
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: '1h',
  });
});

app.post('/refresh-token', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ erro: 'Refresh token não informado.' });
  }

  if (!isRefreshTokenValid(refreshToken)) {
    return res.status(401).json({ erro: 'Refresh token inválido ou expirado.' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = USERS.find((u) => u.id === payload.id && u.username === payload.username);

    if (!user) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }

    const accessToken = generateAccessToken(user);

    return res.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
    });
  } catch (err) {
    return res.status(401).json({ erro: 'Refresh token inválido ou expirado.' });
  }
});

app.post('/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }

  return res.json({ message: 'Logout realizado com sucesso.' });
});

app.get('/profile', authenticateToken, (req, res) => {
  const user = USERS.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  return res.json({ id: user.id, username: user.username, name: user.name });
});

app.get('/protected', authenticateToken, (req, res) => {
  return res.json({ message: 'Acesso autorizado a rota protegida.', user: req.user });
});

app.use('/calendario', authenticateToken, calendarioRouter);
app.use('/lembretes', authenticateToken, lembretesRouter);
app.use('/materias', authenticateToken, materiasRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});