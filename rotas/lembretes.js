const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../auth');

const lembretes = [];
let nextId = 1;

const PrioridadesVal = ['baixa', 'media', 'alta'];

router.get('/', authenticateToken, (req, res) => {
  const { concluido, prioridade } = req.query;
  let resultado = lembretes.filter((l) => l.userId === req.user.id);

  if (concluido !== undefined) {
    const flag = concluido === 'true';
    resultado = resultado.filter((l) => l.concluido === flag);
  }

  if (prioridade && PrioridadesVal.includes(prioridade)) {
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

router.get('/:id', authenticateToken, (req, res) => {
  const lembrete = lembretes.find(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (!lembrete) {
    return res.status(404).json({ erro: 'Lembrete não Encontrado' });
  }

  return res.json(lembrete);
});

router.post('/', authenticateToken, (req, res) => {
  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  if (!titulo) {
    return res.status(400).json({ erro: 'Título Obrigatório' });
  }

  if (dataVencimento && isNaN(Date.parse(dataVencimento))) {
    return res.status(400).json({ erro: 'Data de Vencimento Inválida' });
  }

  const lembrete = {
    id: nextId++,
    userId: req.user.id,
    titulo,
    descricao: descricao || null,
    dataVencimento: dataVencimento || null,
    prioridade: PrioridadesVal.includes(prioridade) ? prioridade : 'media',
    materiaId: materiaId || null,
    concluido: false,
    concluidoEm: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  lembretes.push(lembrete);
  return res.status(201).json(lembrete);
});

router.put('/:id', authenticateToken, (req, res) => {
  const index = lembretes.findIndex(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Lembrete não encontrado' });
  }

  const { titulo, descricao, dataVencimento, prioridade, materiaId } = req.body;

  lembretes[index] = {
    ...lembretes[index],
    titulo: titulo || lembretes[index].titulo,
    descricao: descricao !== undefined ? descricao : lembretes[index].descricao,
    dataVencimento: dataVencimento !== undefined ? dataVencimento : lembretes[index].dataVencimento,
    prioridade: PrioridadesVal.includes(prioridade) ? prioridade : lembretes[index].prioridade,
    materiaId: materiaId !== undefined ? materiaId : lembretes[index].materiaId,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(lembretes[index]);
});

router.delete('/:id', authenticateToken, (req, res) => {
  const index = lembretes.findIndex(
    (l) => l.id === parseInt(req.params.id) && l.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ erro: 'Lembrete não encontrado' });
  }

  lembretes.splice(index, 1);
  return res.json({ message: 'Lembrete Removido com Sucesso' });
});

module.exports = router;
