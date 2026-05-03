const db = require('../config/database');

// GET /lembretes
async function listar(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM lembretes WHERE usuario_id = ? ORDER BY data_hora ASC',
      [req.usuarioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// POST /lembretes
async function criar(req, res) {
  const { titulo, descricao, data_hora } = req.body;
  if (!titulo || !data_hora) {
    return res.status(400).json({ erro: 'titulo e data_hora são obrigatórios.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO lembretes (usuario_id, titulo, descricao, data_hora) VALUES (?, ?, ?, ?)',
      [req.usuarioId, titulo, descricao || null, data_hora]
    );
    return res.status(201).json({ id: result.insertId, titulo, data_hora });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// PATCH /lembretes/:id/concluir
async function concluir(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM lembretes WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });

    await db.query('UPDATE lembretes SET concluido = TRUE WHERE id = ?', [id]);
    return res.json({ mensagem: 'Lembrete marcado como concluído.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// DELETE /lembretes/:id
async function remover(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM lembretes WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });

    await db.query('DELETE FROM lembretes WHERE id = ?', [id]);
    return res.json({ mensagem: 'Lembrete removido.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, criar, concluir, remover };
