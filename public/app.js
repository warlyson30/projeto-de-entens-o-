/* ══════════════════════════════════════════
   app.js — dashboard principal
   Compatível com index.js (Node/Express)

   Rotas do back:
     GET/POST  /lembretes
     PATCH     /lembretes/:id/toggle-concluido
     DELETE    /lembretes/:id
     GET/POST  /materias
     DELETE    /materias/:id
     GET/POST  /calendario
     DELETE    /calendario/:id
     GET       /profile
     POST      /logout        { refreshToken }
     POST      /refresh-token { refreshToken }
══════════════════════════════════════════ */

const BASE = '';
let accessToken  = localStorage.getItem('accessToken')  || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

/* ── Guard: sem token → login ── */
if (!accessToken) {
  window.location.replace('login.html');
}

/* ══════════ HTTP ══════════ */
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
  };
}

/* Tenta renovar o accessToken via refresh-token antes de redirecionar */
async function tryRefresh() {
  if (!refreshToken) return false;
  try {
    const r = await fetch(BASE + '/refresh-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    accessToken = data.accessToken;
    localStorage.setItem('accessToken', accessToken);
    return true;
  } catch {
    return false;
  }
}

async function req(method, path, body, _retry = false) {
  try {
    const opts = { method, headers: getHeaders() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(BASE + path, opts);

    if (r.status === 401 && !_retry) {
      // Tenta renovar o token uma vez
      const renewed = await tryRefresh();
      if (renewed) return req(method, path, body, true);
      // Falhou → desloga
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.replace('login.html');
      return null;
    }

    const json = await r.json();
    return { status: r.status, body: json, ok: r.ok };
  } catch (e) {
    return { status: 0, body: { erro: 'Servidor inacessível.' }, ok: false };
  }
}

/* ══════════ UI UTILS ══════════ */
function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showPanel(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (name === 'calendario') { renderCalBig(); listarEventos(); }
  if (name === 'materias')   { listarMaterias(); }
  if (name === 'lembretes')  { listarLembretes(); }
  if (name === 'perfil')     { carregarPerfil(); }
  if (name === 'dashboard')  { loadDashboard(); }
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

/* ══════════ AUTH ══════════ */

/*
  POST /logout
  Body: { refreshToken }
  200 : { message }
*/
function logout() {
  // Abre modal de confirmação antes de deslogar
  document.getElementById('modal-logout')?.classList.add('open');
}

function closeLogoutModal() {
  document.getElementById('modal-logout')?.classList.remove('open');
}

async function confirmarLogout() {
  closeLogoutModal();
  const refreshToken = localStorage.getItem('refreshToken');
  await req('POST', '/logout', { refreshToken });
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.replace('login.html');
}

/*
  GET /profile
  200: { id, username, name }
*/
async function carregarPerfil() {
  const r = await req('GET', '/profile');
  if (!r || !r.ok) return;

  const u = r.body; // { id, username, name }
  document.getElementById('sidebar-username').textContent = u.name.split(' ')[0];

  const area = document.getElementById('perfil-area');
  if (area) {
    area.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-avatar">👤</div>
        <div>
          <div class="perfil-name">${u.name}</div>
          <div class="perfil-username">@${u.username} · ID ${u.id}</div>
        </div>
      </div>
      <div class="card-box">
        <div class="card-box-title" style="margin-bottom:12px">📈 Estatísticas</div>
        <p style="color:var(--text-muted);font-size:0.875rem">
          Estatísticas de estudo serão exibidas aqui conforme você usa o Pomodoro e registra atividades.
        </p>
      </div>`;
  }
}

/* ══════════ DASHBOARD ══════════ */
async function loadDashboard() {
  await Promise.all([loadDashTarefas(), loadDashMaterias()]);
}

/*
  GET /lembretes
  200: [ { id, titulo, descricao, dataVencimento, prioridade, materiaId, concluido, concluidoEm, criadoEm, atualizadoEm } ]
*/
async function loadDashTarefas() {
  const container = document.getElementById('dash-tarefas');
  const r = await req('GET', '/lembretes');
  if (!r || !r.ok || !Array.isArray(r.body)) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>Erro ao carregar tarefas</div>`;
    return;
  }
  if (r.body.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div>Nenhuma tarefa ainda</div>`;
    return;
  }
  const tagColors = ['', 'green', 'yellow', 'pink'];
  container.innerHTML = r.body.slice(0, 5).map((l, i) => {
    const tc = tagColors[i % tagColors.length];
    return `
    <div class="task-item">
      <button class="task-check ${l.concluido ? 'done' : ''}" onclick="toggleLembrete(${l.id})">
        ${l.concluido ? '✓' : ''}
      </button>
      <span class="task-label ${l.concluido ? 'done' : ''}">${l.titulo}</span>
      <span class="task-tag ${tc}">${l.prioridade}</span>
      <button class="task-delete" onclick="deletarLembrete(${l.id})">🗑</button>
    </div>`;
  }).join('');
}

/*
  GET /materias
  200: [ { id, nome, professor, cor, cargaHor, criadoEm, atualizadoEm } ]
*/
async function loadDashMaterias() {
  const container = document.getElementById('dash-materias');
  const r = await req('GET', '/materias');
  if (!r || !r.ok || !Array.isArray(r.body)) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">❌</div>Erro ao carregar matérias</div>`;
    return;
  }
  if (r.body.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div>Nenhuma matéria ainda</div>`;
    return;
  }
  const icons = ['🧮', '💾', '🔢', '📝', '⚗️', '🌐', '📐', '🖥️'];
  container.innerHTML = r.body.map((m, i) => {
    const icon = icons[i % icons.length];
    const cor  = m.cor || '#7C3AED';
    const bg   = cor + '1a';
    // m.professor vem do back como professor (camelCase já mapeado em materiaToApi)
    const profHtml = m.professor ? `<div class="mat-prof">Prof. ${m.professor}</div>` : '';
    return `
    <div class="materia-card" style="background:${bg};color:${cor}">
      <span class="mat-icon">${icon}</span>
      <div class="mat-name">${m.nome}</div>
      ${profHtml}
    </div>`;
  }).join('');
}

/* ══════════ LEMBRETES ══════════ */

/*
  POST /lembretes
  Body: { titulo, descricao?, dataVencimento?, prioridade?, materiaId? }
  - prioridade aceita: 'baixa' | 'media' | 'alta'  (back usa 'media' como default)
  - dataVencimento: string ISO 8601 ou null
  201: lembrete criado
*/
async function criarLembrete() {
  const titulo         = document.getElementById('lem-titulo').value.trim();
  const prioridade     = document.getElementById('lem-prioridade').value;   // 'baixa'|'media'|'alta'
  const dataVencimento = document.getElementById('lem-data').value || null; // ISO local datetime ou null
  const descricao      = document.getElementById('lem-desc').value.trim() || null;

  if (!titulo) { toast('Informe o título da tarefa.', 'error'); return; }

  const r = await req('POST', '/lembretes', { titulo, prioridade, dataVencimento, descricao });
  if (r && r.ok) {
    toast('Tarefa criada!');
    closeModal('modal-add-lembrete');
    document.getElementById('lem-titulo').value = '';
    document.getElementById('lem-desc').value   = '';
    document.getElementById('lem-data').value   = '';
    await Promise.all([listarLembretes(), loadDashTarefas(), renderMiniCal(), renderCalBig()]);
  } else {
    // Back retorna { erro } neste router
    toast((r?.body?.erro) || 'Erro ao criar tarefa.', 'error');
  }
}

/*
  GET /lembretes
  200: array de lembretes
*/
async function listarLembretes() {
  const lista = document.getElementById('lista-lembretes');
  const r = await req('GET', '/lembretes');
  if (!r || !r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>Erro ao carregar tarefas</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div>Nenhuma tarefa ainda</div>`;
    return;
  }
  lista.innerHTML = r.body.map(l => {
    // dataVencimento vem como string do banco (UTC) — formata para pt-BR
    const venc = l.dataVencimento
      ? new Date(l.dataVencimento).toLocaleString('pt-BR')
      : 'Sem vencimento';
    return `
    <div class="lembrete-item">
      <button class="lembrete-check ${l.concluido ? 'done' : ''}" onclick="toggleLembrete(${l.id})">
        ${l.concluido ? '✓' : ''}
      </button>
      <div class="lembrete-info">
        <h4 style="${l.concluido ? 'text-decoration:line-through;opacity:.5' : ''}">${l.titulo}</h4>
        <p>${venc}${l.descricao ? ' · ' + l.descricao : ''}</p>
      </div>
      <span class="prio-badge prio-${l.prioridade}">${l.prioridade}</span>
      <button class="btn-danger" style="padding:5px 10px" onclick="deletarLembrete(${l.id})">🗑</button>
    </div>`;
  }).join('');
}

/*
  PATCH /lembretes/:id/toggle-concluido
  200: lembrete atualizado
*/
async function toggleLembrete(id) {
  const r = await req('PATCH', `/lembretes/${id}/toggle-concluido`);
  if (r && r.ok) { listarLembretes(); loadDashTarefas(); }
  else toast('Erro ao atualizar tarefa.', 'error');
}

/*
  DELETE /lembretes/:id
  200: { message }
*/
async function deletarLembrete(id) {
  const r = await req('DELETE', `/lembretes/${id}`);
  if (r && r.ok) {
    toast('Tarefa removida.');
    listarLembretes();
    loadDashTarefas();
  } else {
    toast((r?.body?.erro) || 'Erro ao remover tarefa.', 'error');
  }
}

/* ══════════ MATÉRIAS ══════════ */

/*
  POST /materias
  Body: { nome, professor?, cor?, cargaHor? }
  201: matéria criada
*/
async function criarMateria() {
  const nome      = document.getElementById('mat-nome').value.trim();
  const professor = document.getElementById('mat-prof').value.trim() || null;
  const cargaHor  = parseInt(document.getElementById('mat-carga').value) || null;
  const cor       = document.getElementById('mat-cor').value || '#7C3AED';

  if (!nome) { toast('Informe o nome da matéria.', 'error'); return; }

  // Back espera { nome, professor, cor, cargaHor }
  const r = await req('POST', '/materias', { nome, professor, cor, cargaHor });
  if (r && r.ok) {
    toast('Matéria criada!');
    closeModal('modal-add-materia');
    document.getElementById('mat-nome').value  = '';
    document.getElementById('mat-prof').value  = '';
    document.getElementById('mat-carga').value = '';
    listarMaterias();
    loadDashMaterias();
  } else {
    toast((r?.body?.erro) || 'Erro ao criar matéria.', 'error');
  }
}

/*
  GET /materias
  200: [ { id, nome, professor, cor, cargaHor, criadoEm, atualizadoEm } ]
*/
async function listarMaterias() {
  const lista = document.getElementById('lista-materias');
  const r = await req('GET', '/materias');
  if (!r || !r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">❌</div>Erro ao carregar matérias</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div>Nenhuma matéria ainda</div>`;
    return;
  }
  const icons = ['🧮', '💾', '🔢', '📝', '⚗️', '🌐', '📐', '🖥️'];
  lista.innerHTML = r.body.map((m, i) => {
    const icon   = icons[i % icons.length];
    const cor    = m.cor || '#7C3AED';
    const bg     = cor + '1a';
    const border = cor + '55';
    // cargaHor vem como m.cargaHor (materiaToApi já mapeia carga_hor → cargaHor)
    const sub = [
      m.professor ? 'Prof. ' + m.professor : '',
      m.cargaHor  ? m.cargaHor + 'h'      : '',
    ].filter(Boolean).join(' · ');
    return `
    <div class="mat-page-card" style="background:${bg};color:${cor};border:1.5px solid ${border}">
      <span class="mat-card-icon">${icon}</span>
      <div class="mat-card-name">${m.nome}</div>
      <div class="mat-card-sub">${sub}</div>
      <div class="mat-card-actions">
        <button class="btn-danger" onclick="deletarMateria(${m.id})">🗑 Remover</button>
      </div>
    </div>`;
  }).join('');
}

/*
  DELETE /materias/:id
  200: { message }
*/
async function deletarMateria(id) {
  const r = await req('DELETE', `/materias/${id}`);
  if (r && r.ok) {
    toast('Matéria removida.');
    listarMaterias();
    loadDashMaterias();
  } else {
    toast((r?.body?.erro) || 'Erro ao remover matéria.', 'error');
  }
}

/* ══════════ CALENDÁRIO ══════════ */
let calYear     = new Date().getFullYear();
let calMonth    = new Date().getMonth();
let calBigYear  = calYear;
let calBigMonth = calMonth;
let lembretesPorDia = {};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

/*
  GET /lembretes — usado para montar o cache do calendário
  Filtra os que têm dataVencimento para exibir no calendário
*/
async function carregarLembretesCalendario() {
  const r = await req('GET', '/lembretes');
  lembretesPorDia = {};
  if (!r || !r.ok || !Array.isArray(r.body)) return;
  r.body.forEach(l => {
    if (l.dataVencimento) {
      const d   = new Date(l.dataVencimento);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!lembretesPorDia[key]) lembretesPorDia[key] = [];
      lembretesPorDia[key].push(l);
    }
  });
}

function getLembretesDia(year, month, day) {
  const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return lembretesPorDia[key] || [];
}

async function renderMiniCal() {
  await carregarLembretesCalendario();
  const title = document.getElementById('mini-cal-title');
  const grid  = document.getElementById('mini-cal-grid');
  if (!title || !grid) return;
  title.textContent = `${MONTHS[calMonth]} ${calYear}`;

  const today       = new Date();
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

  let html = DAYS.map(d => `<div class="cal-day-label">${d.slice(0,1)}</div>`).join('');
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other-month">${daysInPrev - firstDay + i + 1}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const lems    = getLembretesDia(calYear, calMonth, d);
    const dots    = lems.length > 0
      ? `<div class="lem-dots">${lems.slice(0,3).map(() => `<div class="lem-dot"></div>`).join('')}</div>`
      : '';
    html += `<div class="cal-day${isToday ? ' today' : ''}">${d}${dots}</div>`;
  }
  grid.innerHTML = html;
}

function calMove(dir) {
  calMonth += dir;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  renderMiniCal();
}

async function renderCalBig() {
  await carregarLembretesCalendario();
  const title = document.getElementById('cal-big-title');
  const grid  = document.getElementById('cal-big-days');
  if (!title || !grid) return;
  title.textContent = `${MONTHS[calBigMonth]} ${calBigYear}`;

  const today       = new Date();
  const firstDay    = new Date(calBigYear, calBigMonth, 1).getDay();
  const daysInMonth = new Date(calBigYear, calBigMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calBigYear, calBigMonth, 0).getDate();

  let html = '';
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-big-day other-month"><span>${daysInPrev - firstDay + i + 1}</span></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calBigMonth === today.getMonth() && calBigYear === today.getFullYear();
    const lems    = getLembretesDia(calBigYear, calBigMonth, d);
    let pills = '';
    if (lems.length > 0) {
      pills = `<div class="lem-pills">` +
        lems.slice(0, 2).map(l => `<div class="lem-pill ${l.prioridade || ''}" title="${l.titulo}">${l.titulo}</div>`).join('') +
        (lems.length > 2 ? `<div class="lem-pill">+${lems.length - 2}</div>` : '') +
        `</div>`;
    }
    html += `<div class="cal-big-day${isToday ? ' today' : ''}"><span>${d}</span>${pills}</div>`;
  }
  grid.innerHTML = html;
}

function calBigMove(dir) {
  calBigMonth += dir;
  if (calBigMonth < 0)  { calBigMonth = 11; calBigYear--; }
  if (calBigMonth > 11) { calBigMonth = 0;  calBigYear++; }
  renderCalBig();
}

/*
  POST /calendario
  Body: { titulo, descricao?, dataInicio, dataFim?, tipo?, cor? }
  - tipo aceita: 'prova'|'trabalho'|'aula'|'outro' (back usa 'outro' como default)
  - dataInicio: obrigatório, ISO 8601
  201: evento criado
*/
async function criarEvento() {
  const titulo     = document.getElementById('ev-titulo').value.trim();
  const tipo       = document.getElementById('ev-tipo').value;           // enum do back
  const dataInicio = document.getElementById('ev-inicio').value || null; // ISO datetime-local
  const dataFim    = document.getElementById('ev-fim').value    || null;
  const descricao  = document.getElementById('ev-desc').value.trim() || null;
  const cor        = document.getElementById('ev-cor').value;

  if (!titulo)     { toast('Informe o título do evento.', 'error'); return; }
  if (!dataInicio) { toast('Informe a data de início.', 'error');   return; }

  // Back espera camelCase: dataInicio, dataFim
  const r = await req('POST', '/calendario', { titulo, tipo, dataInicio, dataFim, descricao, cor });
  if (r && r.ok) {
    toast('Evento criado!');
    closeModal('modal-add-evento');
    document.getElementById('ev-titulo').value = '';
    document.getElementById('ev-desc').value   = '';
    document.getElementById('ev-inicio').value = '';
    document.getElementById('ev-fim').value    = '';
    listarEventos();
  } else {
    toast((r?.body?.erro) || 'Erro ao criar evento.', 'error');
  }
}

/*
  GET /calendario
  200: [ { id, titulo, descricao, dataInicio, dataFim, tipo, cor, criadoEm, atualizadoEm } ]
  Suporta query ?mes=&ano= mas o front busca tudo e filtra localmente
*/
async function listarEventos() {
  const lista = document.getElementById('lista-eventos');
  const r = await req('GET', '/calendario');
  if (!r || !r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>Erro ao carregar eventos</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div>Nenhum evento ainda</div>`;
    return;
  }
  lista.innerHTML = r.body.map(e => {
    // dataInicio vem como string do banco (campo data_inicio → dataInicio via toApi)
    const inicio = e.dataInicio ? new Date(e.dataInicio).toLocaleString('pt-BR') : '';
    return `
    <div class="evento-item">
      <div class="evento-dot" style="background:${e.cor || '#7C3AED'}"></div>
      <div class="evento-info">
        <h4>${e.titulo}</h4>
        <p>${inicio}${e.descricao ? ' · ' + e.descricao : ''}</p>
      </div>
      <span class="evento-tipo">${e.tipo}</span>
      <button class="btn-danger" style="padding:5px 10px;margin-left:8px" onclick="deletarEvento(${e.id})">🗑</button>
    </div>`;
  }).join('');
}

/*
  DELETE /calendario/:id
  200: { message }
*/
async function deletarEvento(id) {
  const r = await req('DELETE', `/calendario/${id}`);
  if (r && r.ok) { toast('Evento removido.'); listarEventos(); }
  else toast((r?.body?.erro) || 'Erro ao remover evento.', 'error');
}

/* ══════════ POMODORO ══════════ */
const POMO_MODES = {
  foco:  { label: 'Foco',        next: 'Até a próxima pausa', secs: 25 * 60 },
  curta: { label: 'Pausa Curta', next: 'Retome em breve',     secs:  5 * 60 },
  longa: { label: 'Pausa Longa', next: 'Relaxe um pouco',     secs: 10 * 60 },
};

let pomoMode      = 'foco';
let pomoTotal     = POMO_MODES.foco.secs;
let pomoRemaining = pomoTotal;
let pomoRunning   = false;
let pomoInterval  = null;
let pomoCycles    = 0;
let pomoFocoMin   = 0;
let pomoPausas    = 0;
const CIRC        = 2 * Math.PI * 95;

function pomoFmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function pomoRender() {
  document.getElementById('pomo-clock').textContent  = pomoFmt(pomoRemaining);
  document.getElementById('pomo-phase').textContent  = POMO_MODES[pomoMode].label;
  document.getElementById('pomo-next').textContent   = POMO_MODES[pomoMode].next;
  document.getElementById('pomo-cycles').textContent = pomoCycles;
  document.getElementById('pomo-btn').textContent    = pomoRunning ? '⏸ Parar' : '▶ Iniciar';
  document.getElementById('pomo-ring').style.strokeDashoffset = CIRC * (1 - pomoRemaining / pomoTotal);
  document.getElementById('stat-foco').textContent   = pomoFocoMin + ' min';
  document.getElementById('stat-pausas').textContent = String(pomoPausas).padStart(2,'0');
  document.getElementById('stat-ciclos').textContent = String(pomoCycles).padStart(2,'0');
}

function pomoToggle() {
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
  } else {
    pomoRunning = true;
    pomoInterval = setInterval(() => {
      if (pomoRemaining > 0) {
        pomoRemaining--;
        if (pomoMode === 'foco') pomoFocoMin = Math.floor((pomoTotal - pomoRemaining) / 60);
        pomoRender();
      } else {
        clearInterval(pomoInterval);
        pomoRunning = false;
        if (pomoMode === 'foco') { pomoCycles++; pomoPausas++; }
        toast(POMO_MODES[pomoMode].label + ' concluído! 🎉');
        pomoSetMode(pomoMode === 'foco' ? 'curta' : 'foco');
      }
    }, 1000);
  }
  pomoRender();
}

function pomoReset() {
  clearInterval(pomoInterval);
  pomoRunning   = false;
  pomoRemaining = pomoTotal;
  pomoRender();
}

function pomoSetMode(mode) {
  clearInterval(pomoInterval);
  pomoRunning   = false;
  pomoMode      = mode;
  pomoTotal     = POMO_MODES[mode].secs;
  pomoRemaining = pomoTotal;
  document.querySelectorAll('.session-option').forEach(el => el.classList.remove('active'));
  const map = { foco: 'sess-foco', curta: 'sess-curta', longa: 'sess-longa' };
  document.getElementById(map[mode])?.classList.add('active');
  pomoRender();
}

function pomoStartFromMini() {
  pomoSetMode('foco');
  pomoToggle();
}

/* ══════════ INIT ══════════ */
carregarPerfil();
renderMiniCal();
renderCalBig();
loadDashboard();

/* ── Fecha modal de logout ao clicar no overlay ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-logout')?.addEventListener('click', function(e) {
    if (e.target === this) closeLogoutModal();
  });
});
