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

const calendarioRouter = require('./rotas/calendario');
const materiasRouter = require('./rotas/materias');
const lembretesRouter = require('./rotas/lembretes');

const PORT = process.env.PORT || 3000;
const USERS = [
  { id: 1, username: 'joão', password: '1234', name: 'João da Silva' }
];
let nextUserId = 2;

function findUser(username, password) {
  return USERS.find(
    (user) => user.username === username && user.password === password
  );
}

function findUserByUsername(username) {
  return USERS.find((user) => user.username === username);
}

app.post('/register', (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({
      message: 'Informe username, password e name.',
    });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({
      message: 'O username deve ter pelo menos 3 caracteres.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'A senha deve ter pelo menos 6 caracteres.',
    });
  }

  if (findUserByUsername(username.trim())) {
    return res.status(409).json({
      message: 'Username já está em uso.',
    });
  }

  const newUser = {
    id: nextUserId++,
    username: username.trim(),
    password, // ⚠️ Em produção: substituir por bcrypt.hash(password, 10)
    name: name.trim(),
  };

  USERS.push(newUser);

  return res.status(201).json({
    message: 'Usuário criado com sucesso.',
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
    },
  });
});

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

app.use('/calendario', authenticateToken, calendarioRouter);
app.use('/lembretes', authenticateToken, lembretesRouter);
app.use('/materias', authenticateToken, materiasRouter);  

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

