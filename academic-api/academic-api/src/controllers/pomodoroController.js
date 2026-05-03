const db = require('../config/database');

// GET /pomodoro  — histórico de sessões
async function listar(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, m.nome AS materia_nome
       FROM sessoes_pomodoro p
       LEFT JOIN materias m ON m.id = p.materia_id
       WHERE p.usuario_id = ?
       ORDER BY p.iniciado_em DESC
       LIMIT 50`,
      [req.usuarioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// POST /pomodoro  — iniciar sessão
async function iniciar(req, res) {
  const { materia_id, duracao_minutos, tipo } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO sessoes_pomodoro (usuario_id, materia_id, duracao_minutos, tipo) VALUES (?, ?, ?, ?)',
      [req.usuarioId, materia_id || null, duracao_minutos || 25, tipo || 'foco']
    );
    return res.status(201).json({ id: result.insertId, mensagem: 'Sessão iniciada.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// PATCH /pomodoro/:id/concluir  — finalizar sessão
async function concluir(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM sessoes_pomodoro WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Sessão não encontrada.' });

    await db.query('UPDATE sessoes_pomodoro SET concluida = TRUE WHERE id = ?', [id]);
    return res.json({ mensagem: 'Sessão concluída.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// GET /pomodoro/resumo  — total de minutos focados por matéria (útil pro front)
async function resumo(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
         COALESCE(m.nome, 'Sem matéria')  AS materia,
         COUNT(p.id)                       AS sessoes_concluidas,
         SUM(p.duracao_minutos)            AS minutos_totais
       FROM sessoes_pomodoro p
       LEFT JOIN materias m ON m.id = p.materia_id
       WHERE p.usuario_id = ? AND p.concluida = TRUE AND p.tipo = 'foco'
       GROUP BY p.materia_id`,
      [req.usuarioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, iniciar, concluir, resumo };
