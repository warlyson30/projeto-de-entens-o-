const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { isDataValida, isValorValido } = require('./utils');

const TIPOS_EVENTO = ['prova', 'trabalho', 'aula', 'outro'];

/* Converte linha do banco (snake_case) para o formato da API (camelCase) */
function toApi(row) {
  return {
    id:          row.id,
    titulo:      row.titulo,
    descricao:   row.descricao,
    dataInicio:  row.data_inicio,
    dataFim:     row.data_fim,
    tipo:        row.tipo,
    cor:         row.cor,
    criadoEm:   row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

/* GET /calendario */
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;
  try {
    let sql    = 'SELECT * FROM eventos WHERE user_id = ?';
    const params = [req.user.id];

    if (mes && ano) {
      sql += ' AND MONTH(data_inicio) = ? AND YEAR(data_inicio) = ?';
      params.push(parseInt(mes), parseInt(ano));
    }

    sql += ' ORDER BY data_inicio ASC';
    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(toApi));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar eventos.' });
  }
});

/* GET /calendario/:id */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM eventos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    return res.json(toApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar evento.' });
  }
});

/* POST /calendario */
router.post('/', async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, tipo, cor } = req.body;

  if (!titulo || !dataInicio) {
    return res.status(400).json({ erro: 'Título e data de início são obrigatórios.' });
  }
  if (!isDataValida(dataInicio)) {
    return res.status(400).json({ erro: 'dataInicio inválida.' });
  }
  if (dataFim && !isDataValida(dataFim)) {
    return res.status(400).json({ erro: 'dataFim inválida.' });
  }

  try {
    const tipoFinal = isValorValido(tipo, TIPOS_EVENTO) ? tipo : 'outro';
    const [result] = await pool.query(
      `INSERT INTO eventos (titulo, descricao, data_inicio, data_fim, tipo, cor, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao || null, dataInicio, dataFim || null, tipoFinal, cor || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM eventos WHERE id = ?', [result.insertId]);
    return res.status(201).json(toApi(rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar evento.' });
  }
});

/* PUT /calendario/:id */
router.put('/:id', async (req, res) => {
  const { titulo, descricao, dataInicio, dataFim, tipo, cor } = req.body;

  if (dataInicio && !isDataValida(dataInicio)) {
    return res.status(400).json({ erro: 'dataInicio inválida.' });
  }
  if (dataFim && !isDataValida(dataFim)) {
    return res.status(400).json({ erro: 'dataFim inválida.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT * FROM eventos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });

    const e = existing[0];
    await pool.query(
      `UPDATE eventos SET
         titulo       = ?,
         descricao    = ?,
         data_inicio  = ?,
         data_fim     = ?,
         tipo         = ?,
         cor          = ?
       WHERE id = ? AND user_id = ?`,
      [
        titulo      || e.titulo,
        descricao   !== undefined ? descricao   : e.descricao,
        dataInicio  || e.data_inicio,
        dataFim     !== undefined ? dataFim     : e.data_fim,
        isValorValido(tipo, TIPOS_EVENTO) ? tipo : e.tipo,
        cor         !== undefined ? cor         : e.cor,
        req.params.id,
        req.user.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
    return res.json(toApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar evento.' });
  }
});

/* DELETE /calendario/:id */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM eventos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    return res.json({ message: 'Evento removido com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao remover evento.' });
  }
});

module.exports = router;
