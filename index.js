require('dotenv').config();
const express = require('express');
const path    = require('path');
const jwt     = require('jsonwebtoken');
const {
  bcrypt,
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} = require('./auth');
const pool = require('./db');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const cors = require('cors');
app.use(cors({
  origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const calendarioRouter = require('./rotas/calendario');
const materiasRouter   = require('./rotas/materias');
const lembretesRouter  = require('./rotas/lembretes');

const PORT = process.env.PORT || 3000;

/* ── Registro ── */
app.post('/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Informe username, senha e nome.' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ message: 'O username deve ter pelo menos 3 caracteres.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE username = ?',
      [username.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username já está em uso.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (username, password, name) VALUES (?, ?, ?)',
      [username.trim(), hash, name.trim()]
    );

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      user: { id: result.insertId, username: username.trim(), name: name.trim() },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno ao registrar.' });
  }
});

/* ── Login ── */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Informe usuário e senha.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    return res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '1h' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno ao fazer login.' });
  }
});

/* ── Refresh Token ── */
app.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!(await isRefreshTokenValid(refreshToken))) {
    return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || 'substitua_por_uma_chave_secreta_forte');
    const [rows]  = await pool.query('SELECT * FROM usuarios WHERE id = ?', [payload.id]);
    const user    = rows[0];

    if (!user) return res.status(401).json({ message: 'Usuário não encontrado.' });

    return res.json({
      accessToken: generateAccessToken(user),
      tokenType: 'Bearer',
      expiresIn: '1h',
    });
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
});

/* ── Logout ── */
app.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefreshToken(refreshToken);
  return res.json({ message: 'Logout realizado com sucesso.' });
});

/* ── Profile ── */
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

app.use('/calendario', authenticateToken, calendarioRouter);
app.use('/lembretes',  authenticateToken, lembretesRouter);
app.use('/materias',   authenticateToken, materiasRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
