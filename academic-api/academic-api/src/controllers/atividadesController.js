const db = require('../config/database');

// GET /atividades  (com filtros opcionais: ?materia_id=1&tipo=prova&status=pendente)
async function listar(req, res) {
  const { materia_id, tipo, status } = req.query;

  let sql    = 'SELECT a.*, m.nome AS materia_nome FROM atividades a LEFT JOIN materias m ON m.id = a.materia_id WHERE a.usuario_id = ?';
  const params = [req.usuarioId];

  if (materia_id) { sql += ' AND a.materia_id = ?';  params.push(materia_id); }
  if (tipo)       { sql += ' AND a.tipo = ?';         params.push(tipo); }
  if (status)     { sql += ' AND a.status = ?';       params.push(status); }

  sql += ' ORDER BY a.prazo ASC, a.criado_em DESC';

  try {
    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// GET /atividades/:id
async function buscarPorId(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT a.*, m.nome AS materia_nome FROM atividades a LEFT JOIN materias m ON m.id = a.materia_id WHERE a.id = ? AND a.usuario_id = ?',
      [req.params.id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// POST /atividades
async function criar(req, res) {
  const { titulo, descricao, tipo, status, prazo, materia_id, nota } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'titulo é obrigatório.' });

  try {
    const [result] = await db.query(
      'INSERT INTO atividades (usuario_id, materia_id, titulo, descricao, tipo, status, prazo, nota) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.usuarioId, materia_id || null, titulo, descricao || null, tipo || 'outro', status || 'pendente', prazo || null, nota || null]
    );
    return res.status(201).json({ id: result.insertId, titulo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// PUT /atividades/:id
async function atualizar(req, res) {
  const { id } = req.params;
  const { titulo, descricao, tipo, status, prazo, materia_id, nota } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id FROM atividades WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    await db.query(
      `UPDATE atividades SET
        titulo      = COALESCE(?, titulo),
        descricao   = COALESCE(?, descricao),
        tipo        = COALESCE(?, tipo),
        status      = COALESCE(?, status),
        prazo       = COALESCE(?, prazo),
        materia_id  = COALESCE(?, materia_id),
        nota        = COALESCE(?, nota)
       WHERE id = ?`,
      [titulo || null, descricao || null, tipo || null, status || null, prazo || null, materia_id || null, nota || null, id]
    );
    return res.json({ mensagem: 'Atividade atualizada.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// DELETE /atividades/:id
async function remover(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id FROM atividades WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    await db.query('DELETE FROM atividades WHERE id = ?', [id]);
    return res.json({ mensagem: 'Atividade removida.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// GET /atividades/rendimento  — notas por matéria para o gráfico
async function rendimento(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
         m.nome                          AS materia,
         COUNT(a.id)                     AS total,
         SUM(a.status = 'concluida')     AS concluidas,
         AVG(a.nota)                     AS media_nota
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ?
       GROUP BY a.materia_id`,
      [req.usuarioId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, rendimento };
