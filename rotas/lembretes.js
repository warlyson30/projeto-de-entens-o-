const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { isDataValida, isValorValido } = require('./utils');

const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta'];

function toApi(row) {
  return {
    id:             row.id,
    titulo:         row.titulo,
    descricao:      row.descricao,
    dataVencimento: row.data_vencimento,
    prioridade:     row.prioridade,
    materiaId:      row.materia_id,
    concluido:      Boolean(row.concluido),
    concluidoEm:   row.concluido_em,
    criadoEm:      row.criado_em,
    atualizadoEm:  row.atualizado_em,
  };
}

/* GET /lembretes */
router.get('/', async (req, res) => {
  const { concluido, prioridade } = req.query;
  try {
    let sql    = 'SELECT * FROM lembretes WHERE user_id = ?';
    const params = [req.user.id];

    if (concluido !== undefined) {
      sql += ' AND concluido = ?';
      params.push(concluido === 'true' ? 1 : 0);
    }
    if (prioridade && isValorValido(prioridade, PRIORIDADES_VALIDAS)) {
      sql += ' AND prioridade = ?';
      params.push(prioridade);
    }

    sql += ' ORDER BY concluido ASC, data_vencimento ASC';
    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(toApi));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar lembretes.' });
  }
});

/* GET /lembretes/:id */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM lembretes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });
    return res.json(toApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar lembrete.' });
  }
});

/* POST /lembretes */
router.post('/', async (req, res) => {
  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  if (!titulo) return res.status(400).json({ erro: 'Título obrigatório.' });
  if (dataVencimento && !isDataValida(dataVencimento)) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  try {
    const prioFinal = isValorValido(prioridade, PRIORIDADES_VALIDAS) ? prioridade : 'media';
    const [result] = await pool.query(
      `INSERT INTO lembretes (titulo, descricao, data_vencimento, prioridade, materia_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descricao || null, dataVencimento || null, prioFinal, materiaId || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM lembretes WHERE id = ?', [result.insertId]);
    return res.status(201).json(toApi(rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar lembrete.' });
  }
});

/* PUT /lembretes/:id */
router.put('/:id', async (req, res) => {
  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  if (dataVencimento != null && !isDataValida(dataVencimento)) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT * FROM lembretes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });

    const l = existing[0];
    await pool.query(
      `UPDATE lembretes SET
         titulo          = ?,
         descricao       = ?,
         data_vencimento = ?,
         prioridade      = ?,
         materia_id      = ?
       WHERE id = ? AND user_id = ?`,
      [
        titulo       || l.titulo,
        descricao    !== undefined ? descricao    : l.descricao,
        dataVencimento !== undefined ? dataVencimento : l.data_vencimento,
        isValorValido(prioridade, PRIORIDADES_VALIDAS) ? prioridade : l.prioridade,
        materiaId    !== undefined ? materiaId    : l.materia_id,
        req.params.id,
        req.user.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM lembretes WHERE id = ?', [req.params.id]);
    return res.json(toApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar lembrete.' });
  }
});

/* PATCH /lembretes/:id/toggle-concluido */
router.patch('/:id/toggle-concluido', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM lembretes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });

    const l           = existing[0];
    const novoConcluido = l.concluido ? 0 : 1;
    const concluidoEm  = novoConcluido ? new Date() : null;

    await pool.query(
      'UPDATE lembretes SET concluido = ?, concluido_em = ? WHERE id = ? AND user_id = ?',
      [novoConcluido, concluidoEm, req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM lembretes WHERE id = ?', [req.params.id]);
    return res.json(toApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar lembrete.' });
  }
});

/* DELETE /lembretes/:id */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM lembretes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });
    return res.json({ message: 'Lembrete removido com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao remover lembrete.' });
  }
});

module.exports = router;
