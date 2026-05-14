const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { isDataValida, isValorValido, isNotaValida, isPesoValido } = require('./utils');

const TIPOS_ATIVIDADE  = ['prova', 'trabalho', 'exercicio', 'projeto', 'outro'];
const STATUS_ATIVIDADE = ['pendente', 'em_andamento', 'concluida', 'cancelada'];

function materiaToApi(row) {
  return {
    id:          row.id,
    nome:        row.nome,
    professor:   row.professor,
    cor:         row.cor,
    cargaHor:    row.carga_hor,
    criadoEm:   row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

function atividadeToApi(row) {
  return {
    id:          row.id,
    materiaId:   row.materia_id,
    titulo:      row.titulo,
    descricao:   row.descricao,
    tipo:        row.tipo,
    dataEntrega: row.data_entrega,
    status:      row.status,
    nota:        row.nota,
    peso:        row.peso,
    criadoEm:   row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

/* GET /materias */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM materias WHERE user_id = ? ORDER BY nome ASC',
      [req.user.id]
    );
    return res.json(rows.map(materiaToApi));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar matérias.' });
  }
});

/* GET /materias/:id */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM materias WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    const [atividades] = await pool.query(
      'SELECT * FROM atividades WHERE materia_id = ? AND user_id = ?',
      [rows[0].id, req.user.id]
    );

    return res.json({ ...materiaToApi(rows[0]), atividades: atividades.map(atividadeToApi) });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar matéria.' });
  }
});

/* POST /materias */
router.post('/', async (req, res) => {
  const { nome, professor, cor, cargaHor } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome da matéria obrigatório.' });

  try {
    const [result] = await pool.query(
      'INSERT INTO materias (nome, professor, cor, carga_hor, user_id) VALUES (?, ?, ?, ?, ?)',
      [nome, professor || null, cor || '#7C3AED', cargaHor || null, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM materias WHERE id = ?', [result.insertId]);
    return res.status(201).json(materiaToApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar matéria.' });
  }
});

/* PUT /materias/:id */
router.put('/:id', async (req, res) => {
  const { nome, professor, cor, cargaHor } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT * FROM materias WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    const m = existing[0];
    await pool.query(
      `UPDATE materias SET nome = ?, professor = ?, cor = ?, carga_hor = ? WHERE id = ? AND user_id = ?`,
      [
        nome      || m.nome,
        professor !== undefined ? professor : m.professor,
        cor       !== undefined ? cor       : m.cor,
        cargaHor  !== undefined ? cargaHor  : m.carga_hor,
        req.params.id,
        req.user.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM materias WHERE id = ?', [req.params.id]);
    return res.json(materiaToApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar matéria.' });
  }
});

/* DELETE /materias/:id */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM materias WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });
    // Atividades são removidas automaticamente pelo ON DELETE CASCADE
    return res.json({ message: 'Matéria e atividades vinculadas removidas com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao remover matéria.' });
  }
});

/* GET /materias/:id/atividades */
router.get('/:id/atividades', async (req, res) => {
  const { tipo, status } = req.query;
  try {
    const [materia] = await pool.query(
      'SELECT id FROM materias WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (materia.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    let sql    = 'SELECT * FROM atividades WHERE materia_id = ? AND user_id = ?';
    const params = [req.params.id, req.user.id];

    if (tipo && isValorValido(tipo, TIPOS_ATIVIDADE)) { sql += ' AND tipo = ?';   params.push(tipo); }
    if (status && isValorValido(status, STATUS_ATIVIDADE)) { sql += ' AND status = ?'; params.push(status); }

    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(atividadeToApi));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar atividades.' });
  }
});

/* POST /materias/:id/atividades */
router.post('/:id/atividades', async (req, res) => {
  const { titulo, descricao, tipo, dataEntrega, nota, peso } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'O título da atividade é obrigatório.' });
  if (dataEntrega && !isDataValida(dataEntrega)) return res.status(400).json({ erro: 'Data de entrega inválida.' });
  if (nota != null && !isNotaValida(nota)) return res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 10.' });
  if (peso != null && !isPesoValido(peso)) return res.status(400).json({ erro: 'O peso deve ser um número maior que zero.' });

  try {
    const [materia] = await pool.query(
      'SELECT id FROM materias WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (materia.length === 0) return res.status(404).json({ erro: 'Matéria não encontrada.' });

    const tipoFinal = isValorValido(tipo, TIPOS_ATIVIDADE) ? tipo : 'outro';
    const [result] = await pool.query(
      `INSERT INTO atividades (titulo, descricao, tipo, data_entrega, nota, peso, materia_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao || null, tipoFinal, dataEntrega || null, nota ?? null, peso ?? 1, req.params.id, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM atividades WHERE id = ?', [result.insertId]);
    return res.status(201).json(atividadeToApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar atividade.' });
  }
});

/* PUT /materias/:materiaId/atividades/:atividadeId */
router.put('/:materiaId/atividades/:atividadeId', async (req, res) => {
  const { titulo, descricao, tipo, dataEntrega, status, nota, peso } = req.body;
  if (dataEntrega != null && !isDataValida(dataEntrega)) return res.status(400).json({ erro: 'Data de entrega inválida.' });
  if (nota != null && !isNotaValida(nota)) return res.status(400).json({ erro: 'A nota deve ser entre 0 e 10.' });
  if (peso != null && !isPesoValido(peso)) return res.status(400).json({ erro: 'O peso deve ser maior que zero.' });

  try {
    const [existing] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? AND materia_id = ? AND user_id = ?',
      [req.params.atividadeId, req.params.materiaId, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    const a = existing[0];
    await pool.query(
      `UPDATE atividades SET titulo = ?, descricao = ?, tipo = ?, data_entrega = ?, status = ?, nota = ?, peso = ?
       WHERE id = ? AND user_id = ?`,
      [
        titulo      || a.titulo,
        descricao   !== undefined ? descricao   : a.descricao,
        isValorValido(tipo, TIPOS_ATIVIDADE)   ? tipo   : a.tipo,
        dataEntrega !== undefined ? dataEntrega : a.data_entrega,
        isValorValido(status, STATUS_ATIVIDADE) ? status : a.status,
        nota        !== undefined ? nota        : a.nota,
        peso        !== undefined ? peso        : a.peso,
        req.params.atividadeId,
        req.user.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM atividades WHERE id = ?', [req.params.atividadeId]);
    return res.json(atividadeToApi(rows[0]));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar atividade.' });
  }
});

/* DELETE /materias/:materiaId/atividades/:atividadeId */
router.delete('/:materiaId/atividades/:atividadeId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM atividades WHERE id = ? AND materia_id = ? AND user_id = ?',
      [req.params.atividadeId, req.params.materiaId, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });
    return res.json({ message: 'Atividade removida com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao remover atividade.' });
  }
});

module.exports = router;
