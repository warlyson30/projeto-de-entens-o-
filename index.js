require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} = require('./auth');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const USERS = [
  { id: 1, username: 'joão', password: '1234', name: 'João da Silva' }
];

function findUser(username, password) {
  return USERS.find(
    (user) => user.username === username && user.password === password
  );
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Informe usuário e senha.' });
  }

  const user = findUser(username, password);

  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
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

  if (!isRefreshTokenValid(refreshToken)) {
    return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
  }

  const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || 'substua_por_uma_chave_secreta_forte');
  const user = USERS.find((u) => u.id === payload.id && u.username === payload.username);

  if (!user) {
    return res.status(401).json({ message: 'Usuário não encontrado.' });
  }

  const accessToken = generateAccessToken(user);

  return res.json({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: '1h',
  });
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
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  return res.json({ id: user.id, username: user.username, name: user.name });
});

app.get('/protected', authenticateToken, (req, res) => {
  return res.json({ message: 'Acesso autorizado a rota protegida.', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

