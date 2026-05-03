const router = require('express').Router();
const { authMiddleware } = require('../middlewares/auth');
const auth = authMiddleware;  // Alias para legibilidade

const authCtrl       = require('../controllers/authController');
const materiasCtrl   = require('../controllers/materiasController');
const atividadesCtrl = require('../controllers/atividadesController');
const lembretesCtrl  = require('../controllers/lembretesController');
const pomodoroCtrl   = require('../controllers/pomodoroController');
const calendarioCtrl = require('../controllers/calendarioController');

// ── Auth (público) ─────────────────────────────────────────
router.post('/auth/registro',     authCtrl.registro);
router.post('/auth/login',        authCtrl.login);
router.post('/auth/renovar',      authCtrl.renovarToken);
router.post('/auth/logout',       auth, authCtrl.logout);
router.get ('/auth/perfil',       auth, authCtrl.perfil);
router.get ('/auth/info-token',   auth, authCtrl.infoToken);

// ── Matérias ────────────────────────────────────────────────
router.get   ('/materias',     auth, materiasCtrl.listar);
router.post  ('/materias',     auth, materiasCtrl.criar);
router.put   ('/materias/:id', auth, materiasCtrl.atualizar);
router.delete('/materias/:id', auth, materiasCtrl.remover);

// ── Atividades ──────────────────────────────────────────────
router.get   ('/atividades/rendimento', auth, atividadesCtrl.rendimento);
router.get   ('/atividades',            auth, atividadesCtrl.listar);
router.get   ('/atividades/:id',        auth, atividadesCtrl.buscarPorId);
router.post  ('/atividades',            auth, atividadesCtrl.criar);
router.put   ('/atividades/:id',        auth, atividadesCtrl.atualizar);
router.delete('/atividades/:id',        auth, atividadesCtrl.remover);

// ── Lembretes ───────────────────────────────────────────────
router.get   ('/lembretes',              auth, lembretesCtrl.listar);
router.post  ('/lembretes',              auth, lembretesCtrl.criar);
router.patch ('/lembretes/:id/concluir', auth, lembretesCtrl.concluir);
router.delete('/lembretes/:id',          auth, lembretesCtrl.remover);

// ── Pomodoro ─────────────────────────────────────────────────
router.get  ('/pomodoro/resumo',        auth, pomodoroCtrl.resumo);
router.get  ('/pomodoro',               auth, pomodoroCtrl.listar);
router.post ('/pomodoro',               auth, pomodoroCtrl.iniciar);
router.patch('/pomodoro/:id/concluir',  auth, pomodoroCtrl.concluir);

// ── Calendário ───────────────────────────────────────────────
router.get('/calendario/hoje',          auth, calendarioCtrl.obterHoje);
router.get('/calendario/proximos',      auth, calendarioCtrl.obterProximos);
router.get('/calendario',               auth, calendarioCtrl.obterMes);

module.exports = router;
