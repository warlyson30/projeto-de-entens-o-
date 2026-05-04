const express = require('express');
const router = express.Router();
const { isDataValida, isValorValido } = require('../utils');

const eventos = [];
let nextId = 1;

const TIPOS_EVENTO = ['prova', 'trabalho', 'aula', 'outro'];

router.get('/', (req, res) => {
  const { mes, ano } = req.query;

  let resultado = eventos.filter((e) => e.userId === req.user.id);

  if (mes && ano) {
    resultado = resultado.filter((e) => {
      const [anoEvento, mesEvento] = e.dataInicio.split('-').map(Number);
      return mesEvento === parseInt(mes) && anoEvento === parseInt(ano);
    });
  }

  return res.json(resultado);
});

router.get('/:id', (req, res) => {
  const evento = eventos.find(
    (e) => e.id === parseInt(req.params.id) && e.userId === req.user.id
  );

  if (!evento) {
    return res.status(404).json({ erro: 'Evento não encontrado.' });
  }

  return res.json(evento);
});

router.post('/', (req, res) => {
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

  const evento = {
    id: nextId++,
    userId: req.user.id,
    titulo,
    descricao: descricao || null,
    dataInicio,
    dataFim: dataFim || null,
    tipo: isValorValido(tipo, TIPOS_EVENTO) ? tipo : 'outro',
    cor: cor || null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  eventos.push(evento);
  return res.status(201).json(evento);
});

router.put('/:id', (req, res) => {
  const index = eventos.findIndex(
    (e) => e.id === parseInt(req.params.id) && e.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Evento não encontrado.' });
  }

  const { titulo, descricao, dataInicio, dataFim, tipo, cor } = req.body;

  if (dataInicio && !isDataValida(dataInicio)) {
    return res.status(400).json({ erro: 'dataInicio inválida.' });
  }

  if (dataFim && !isDataValida(dataFim)) {
    return res.status(400).json({ erro: 'dataFim inválida.' });
  }

  eventos[index] = {
    ...eventos[index],
    titulo: titulo || eventos[index].titulo,
    descricao: descricao !== undefined ? descricao : eventos[index].descricao,
    dataInicio: dataInicio || eventos[index].dataInicio,
    dataFim: dataFim !== undefined ? dataFim : eventos[index].dataFim,
    tipo: isValorValido(tipo, TIPOS_EVENTO) ? tipo : eventos[index].tipo,
    cor: cor !== undefined ? cor : eventos[index].cor,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(eventos[index]);
});

router.delete('/:id', (req, res) => {
  const index = eventos.findIndex(
    (e) => e.id === parseInt(req.params.id) && e.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Evento não encontrado.' });
  }

  eventos.splice(index, 1);
  return res.json({ message: 'Evento removido com sucesso.' });
});

module.exports = router;