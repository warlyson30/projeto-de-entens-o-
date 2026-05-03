const db = require('../config/database');

// GET /materias
async function listar(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM materias WHERE usuario_id = ? ORDER BY nome',
      [req.usuarioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// POST /materias
async function criar(req, res) {
  const { nome, professor, cor } = req.body;
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório.' });

  try {
    const [result] = await db.query(
      'INSERT INTO materias (usuario_id, nome, professor, cor) VALUES (?, ?, ?, ?)',
      [req.usuarioId, nome, professor || null, cor || '#6366f1']
    );
    return res.status(201).json({ id: result.insertId, nome, professor, cor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// PUT /materias/:id
async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, professor, cor } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    await db.query(
      'UPDATE materias SET nome = COALESCE(?, nome), professor = COALESCE(?, professor), cor = COALESCE(?, cor) WHERE id = ?',
      [nome || null, professor || null, cor || null, id]
    );
    return res.json({ mensagem: 'Matéria atualizada.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// DELETE /materias/:id
async function remover(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    await db.query('DELETE FROM materias WHERE id = ?', [id]);
    return res.json({ mensagem: 'Matéria removida.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, criar, atualizar, remover };
