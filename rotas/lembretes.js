const express = require('express');
const router = express.Router();
const { isDataValida, isValorValido } = require('../utils');

const lembretes = [];
let nextId = 1;

const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta'];

router.get('/', (req, res) => {
  const { concluido, prioridade } = req.query;
  let resultado = lembretes.filter((l) => l.userId === req.user.id);

  if (concluido !== undefined) {
    const flag = concluido === 'true';
    resultado = resultado.filter((l) => l.concluido === flag);
  }

  if (prioridade && isValorValido(prioridade, PRIORIDADES_VALIDAS)) {
    resultado = resultado.filter((l) => l.prioridade === prioridade);
  }

  resultado.sort((a, b) => {
    if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
    if (a.dataVencimento && b.dataVencimento) {
      return new Date(a.dataVencimento) - new Date(b.dataVencimento);
    }
    return 0;
  });

  return res.json(resultado);
});

router.get('/:id', (req, res) => {
  const lembrete = lembretes.find(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (!lembrete) {
    return res.status(404).json({ erro: 'Lembrete não encontrado.' });
  }

  return res.json(lembrete);
});

router.post('/', (req, res) => {
  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  if (!titulo) {
    return res.status(400).json({ erro: 'Título obrigatório.' });
  }

  if (dataVencimento && !isDataValida(dataVencimento)) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  const lembrete = {
    id: nextId++,
    userId: req.user.id,
    titulo,
    descricao: descricao || null,
    dataVencimento: dataVencimento || null,
    prioridade: isValorValido(prioridade, PRIORIDADES_VALIDAS) ? prioridade : 'media',
    materiaId: materiaId || null,
    concluido: false,
    concluidoEm: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  lembretes.push(lembrete);
  return res.status(201).json(lembrete);
});

router.put('/:id', (req, res) => {
  const index = lembretes.findIndex(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Lembrete não encontrado.' });
  }

  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  if (dataVencimento !== undefined && dataVencimento !== null && !isDataValida(dataVencimento)) {
    return res.status(400).json({ erro: 'Data de vencimento inválida.' });
  }

  lembretes[index] = {
    ...lembretes[index],
    titulo: titulo || lembretes[index].titulo,
    descricao: descricao !== undefined ? descricao : lembretes[index].descricao,
    dataVencimento: dataVencimento !== undefined ? dataVencimento : lembretes[index].dataVencimento,
    prioridade: isValorValido(prioridade, PRIORIDADES_VALIDAS) ? prioridade : lembretes[index].prioridade,
    materiaId: materiaId !== undefined ? materiaId : lembretes[index].materiaId,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(lembretes[index]);
});

router.patch('/:id/toggle-concluido', (req, res) => {
  const index = lembretes.findIndex(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Lembrete não encontrado.' });
  }

  const lembrete = lembretes[index];
  lembrete.concluido = !lembrete.concluido;
  lembrete.concluidoEm = lembrete.concluido ? new Date().toISOString() : null;
  lembrete.atualizadoEm = new Date().toISOString();

  return res.json(lembrete);
});

router.delete('/:id', (req, res) => {
  const index = lembretes.findIndex(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Lembrete não encontrado.' });
  }

  lembretes.splice(index, 1);
  return res.json({ message: 'Lembrete removido com sucesso.' });
});

module.exports = router;