const express = require('express');
const router = express.Router();
const { isDataValida, isValorValido, isNotaValida, isPesoValido } = require('../utils');

const materias = [];
const atividades = [];
let nextMateriaId = 1;
let nextAtividadeId = 1;

const TIPOS_ATIVIDADE = ['prova', 'trabalho', 'exercicio', 'projeto', 'outro'];
const STATUS_ATIVIDADE = ['pendente', 'em_andamento', 'concluida', 'cancelada'];

router.get('/', (req, res) => {
  const resultado = materias.filter((m) => m.userId === req.user.id);
  return res.json(resultado);
});

router.get('/:id', (req, res) => {
  const materia = materias.find(
    (m) => m.id === parseInt(req.params.id) && m.userId === req.user.id
  );

  if (!materia) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const atividadesDaMateria = atividades.filter(
    (a) => a.materiaId === materia.id && a.userId === req.user.id
  );

  return res.json({ ...materia, atividades: atividadesDaMateria });
});

router.post('/', (req, res) => {
  const { nome, professor, cor, cargaHor } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome da matéria obrigatório.' });
  }

  const materia = {
    id: nextMateriaId++,
    userId: req.user.id,
    nome,
    professor: professor || null,
    cor: cor || '#7C3AED',
    cargaHor: cargaHor || null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  materias.push(materia);
  return res.status(201).json(materia);
});

router.put('/:id', (req, res) => {
  const index = materias.findIndex(
    (m) => m.id === parseInt(req.params.id) && m.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const { nome, professor, cor, cargaHor } = req.body;

  materias[index] = {
    ...materias[index],
    nome: nome || materias[index].nome,
    professor: professor !== undefined ? professor : materias[index].professor,
    cor: cor !== undefined ? cor : materias[index].cor,
    cargaHor: cargaHor !== undefined ? cargaHor : materias[index].cargaHor,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(materias[index]);
});

router.delete('/:id', (req, res) => {
  const index = materias.findIndex(
    (m) => m.id === parseInt(req.params.id) && m.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const materiaId = materias[index].id;
  materias.splice(index, 1);

  const removidas = atividades.filter(
    (a) => a.materiaId === materiaId && a.userId === req.user.id
  );
  removidas.forEach((a) => {
    const i = atividades.indexOf(a);
    if (i !== -1) atividades.splice(i, 1);
  });

  return res.json({
    message: `Matéria e ${removidas.length} atividade(s) vinculada(s) removidas com sucesso.`,
  });
});

router.get('/:id/atividades', (req, res) => {
  const materia = materias.find(
    (m) => m.id === parseInt(req.params.id) && m.userId === req.user.id
  );

  if (!materia) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const { tipo, status } = req.query;
  let resultado = atividades.filter(
    (a) => a.materiaId === materia.id && a.userId === req.user.id
  );

  if (tipo && isValorValido(tipo, TIPOS_ATIVIDADE)) {
    resultado = resultado.filter((a) => a.tipo === tipo);
  }
  if (status && isValorValido(status, STATUS_ATIVIDADE)) {
    resultado = resultado.filter((a) => a.status === status);
  }

  return res.json(resultado);
});

router.post('/:id/atividades', (req, res) => {
  const materia = materias.find(
    (m) => m.id === parseInt(req.params.id) && m.userId === req.user.id
  );

  if (!materia) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const { titulo, descricao, tipo, dataEntrega, nota, peso } = req.body;

  if (!titulo) {
    return res.status(400).json({ erro: 'O título da atividade é obrigatório.' });
  }

  if (dataEntrega && !isDataValida(dataEntrega)) {
    return res.status(400).json({ erro: 'Data de entrega inválida. Use o formato ISO 8601.' });
  }

  if (nota !== undefined && nota !== null && !isNotaValida(nota)) {
    return res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 10.' });
  }

  if (peso !== undefined && peso !== null && !isPesoValido(peso)) {
    return res.status(400).json({ erro: 'O peso deve ser um número maior que zero.' });
  }

  const atividade = {
    id: nextAtividadeId++,
    userId: req.user.id,
    materiaId: materia.id,
    titulo,
    descricao: descricao || null,
    tipo: isValorValido(tipo, TIPOS_ATIVIDADE) ? tipo : 'outro',
    dataEntrega: dataEntrega || null,
    status: 'pendente',
    nota: nota !== undefined && nota !== null ? nota : null,
    peso: peso !== undefined && peso !== null ? peso : 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  atividades.push(atividade);
  return res.status(201).json(atividade);
});

router.put('/:materiaId/atividades/:atividadeId', (req, res) => {
  const materia = materias.find(
    (m) => m.id === parseInt(req.params.materiaId) && m.userId === req.user.id
  );

  if (!materia) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const index = atividades.findIndex(
    (a) =>
      a.id === parseInt(req.params.atividadeId) &&
      a.materiaId === materia.id &&
      a.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Atividade não encontrada.' });
  }

  const { titulo, descricao, tipo, dataEntrega, status, nota, peso } = req.body;

  if (dataEntrega !== undefined && dataEntrega !== null && !isDataValida(dataEntrega)) {
    return res.status(400).json({ erro: 'Data de entrega inválida. Use o formato ISO 8601.' });
  }

  if (nota !== undefined && nota !== null && !isNotaValida(nota)) {
    return res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 10.' });
  }

  if (peso !== undefined && peso !== null && !isPesoValido(peso)) {
    return res.status(400).json({ erro: 'O peso deve ser um número maior que zero.' });
  }

  atividades[index] = {
    ...atividades[index],
    titulo: titulo || atividades[index].titulo,
    descricao: descricao !== undefined ? descricao : atividades[index].descricao,
    tipo: isValorValido(tipo, TIPOS_ATIVIDADE) ? tipo : atividades[index].tipo,
    dataEntrega: dataEntrega !== undefined ? dataEntrega : atividades[index].dataEntrega,
    status: isValorValido(status, STATUS_ATIVIDADE) ? status : atividades[index].status,
    nota: nota !== undefined ? nota : atividades[index].nota,
    peso: peso !== undefined ? peso : atividades[index].peso,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(atividades[index]);
});

router.delete('/:materiaId/atividades/:atividadeId', (req, res) => {
  const materia = materias.find(
    (m) => m.id === parseInt(req.params.materiaId) && m.userId === req.user.id
  );

  if (!materia) {
    return res.status(404).json({ erro: 'Matéria não encontrada.' });
  }

  const index = atividades.findIndex(
    (a) =>
      a.id === parseInt(req.params.atividadeId) &&
      a.materiaId === materia.id &&
      a.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Atividade não encontrada.' });
  }

  atividades.splice(index, 1);
  return res.json({ message: 'Atividade removida com sucesso.' });
});

module.exports = router;
module.exports.getAtividades = () => atividades;
module.exports.getMaterias = () => materias;