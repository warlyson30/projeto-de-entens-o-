const BASE = '';
let accessToken  = localStorage.getItem('accessToken')  || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

/* ══════════ UTILS ══════════ */
function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
  return h;
}

async function req(method, path, body) {
  try {
    const opts = { method, headers: getHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(BASE + path, opts);
    const json = await r.json();
    return { status: r.status, body: json, ok: r.ok };
  } catch(e) {
    return { status: 0, body: { erro: 'Servidor inacessível.' }, ok: false };
  }
}

function showRes(id, data, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  el.innerHTML = `
    <div class="res-header ${ok ? 'ok' : 'err'}">${ok ? '✅' : '❌'} ${data.status || (ok ? 'OK' : 'ERRO')}</div>
    <div class="res-body">${JSON.stringify(data.body, null, 2)}</div>`;
}

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

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

/* ══════════ AUTH ══════════ */
function updateStatus() {
  const dot = document.getElementById('status-dot');
  const disp = document.getElementById('token-display');
  if (accessToken) {
    dot.className = 'sidebar-dot on';
    document.getElementById('sidebar-username').textContent = 'Autenticado';
    if (disp) disp.innerHTML = `<div class="token-info"><strong>Token:</strong> ${accessToken.slice(0,40)}...</div>`;
  } else {
    dot.className = 'sidebar-dot off';
    document.getElementById('sidebar-username').textContent = 'Desconectado';
    if (disp) disp.innerHTML = '';
  }
}

async function registrar() {
  const username = document.getElementById('reg-username').value.trim();
  const name     = document.getElementById('reg-name').value.trim();
  const password = document.getElementById('reg-password').value;
  const r = await req('POST', '/register', { username, password, name });
  showRes('res-register', r, r.ok);
  if (r.ok) toast('Conta criada com sucesso!');
  else toast(r.body.message || 'Erro ao registrar', 'error');
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const r = await req('POST', '/login', { username, password });
  if (r.ok) {
    accessToken  = r.body.accessToken;
    refreshToken = r.body.refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    updateStatus();
    toast('Login realizado com sucesso! ✅');
    loadDashboard();
    carregarPerfil();
  } else {
    toast(r.body.message || 'Credenciais inválidas', 'error');
  }
  showRes('res-auth', r, r.ok);
}

async function logout() {
  await req('POST', '/logout', { refreshToken });
  accessToken = refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  updateStatus();
  toast('Logout realizado');
}

async function carregarPerfil() {
  const r = await req('GET', '/profile');
  const area = document.getElementById('perfil-area');
  const authArea = document.getElementById('auth-perfil-area');
  if (r.ok) {
    const u = r.body;
    const html = `
      <div class="perfil-card">
        <div class="perfil-avatar">👤</div>
        <div>
          <div class="perfil-name">${u.name}</div>
          <div class="perfil-username">@${u.username} · ID ${u.id}</div>
        </div>
      </div>`;
    if (area) area.innerHTML = html + `
      <div class="card-box">
        <div class="card-box-title" style="margin-bottom:12px">📈 Estatísticas</div>
        <p style="color:var(--text-muted);font-size:0.875rem">Estatísticas de estudo serão exibidas aqui conforme você usa o Pomodoro e registra atividades.</p>
      </div>`;
    if (authArea) authArea.innerHTML = html;
    document.getElementById('sidebar-username').textContent = u.name.split(' ')[0];
  } else {
    if (area) area.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div>Faça login para ver seu perfil</div>`;
  }
}

/* ══════════ DASHBOARD LOAD ══════════ */
async function loadDashboard() {
  await Promise.all([loadDashTarefas(), loadDashMaterias()]);
}

async function loadDashTarefas() {
  const container = document.getElementById('dash-tarefas');
  if (!accessToken) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div>Faça login para ver suas tarefas</div>`;
    return;
  }
  const r = await req('GET', '/lembretes');
  if (!r.ok || !Array.isArray(r.body)) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>Erro ao carregar</div>`; return; }
  if (r.body.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div>Nenhuma tarefa ainda</div>`; return; }

  const tagColors = ['', 'green', 'yellow', 'pink'];
  container.innerHTML = r.body.slice(0,5).map((l, i) => {
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

async function loadDashMaterias() {
  const container = document.getElementById('dash-materias');
  if (!accessToken) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔒</div>Faça login para ver suas matérias</div>`;
    return;
  }
  const r = await req('GET', '/materias');
  if (!r.ok || !Array.isArray(r.body)) { container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">❌</div>Erro ao carregar</div>`; return; }
  if (r.body.length === 0) { container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div>Nenhuma matéria ainda</div>`; return; }

  const icons = ['🧮', '💾', '🔢', '📝', '⚗️', '🌐', '📐', '🖥️'];
  container.innerHTML = r.body.map((m, i) => {
    const icon = icons[i % icons.length];
    const cor  = m.cor || '#7C3AED';
    const bg   = cor + '1a'; // hex com alpha ~10%
    const profHtml = m.professor
      ? `<div class="mat-prof">Prof. ${m.professor}</div>`
      : '';
    return `
    <div class="materia-card" style="background:${bg};color:${cor}">
      <span class="mat-icon">${icon}</span>
      <div class="mat-name">${m.nome}</div>
      ${profHtml}
    </div>`;
  }).join('');
}

/* ══════════ LEMBRETES ══════════ */
async function criarLembrete() {
  const body = {
    titulo:         document.getElementById('lem-titulo').value,
    prioridade:     document.getElementById('lem-prioridade').value,
    dataVencimento: document.getElementById('lem-data').value || null,
    descricao:      document.getElementById('lem-desc').value || null,
  };
  const r = await req('POST', '/lembretes', body);
  showRes('res-lembretes', r, r.ok);
  if (r.ok) {
    toast('Tarefa criada!');
    closeModal('modal-add-lembrete');
    listarLembretes();
    loadDashTarefas();
    renderMiniCal();
    renderCalBig();
    document.getElementById('lem-titulo').value = '';
    document.getElementById('lem-desc').value = '';
  } else {
    toast(r.body.message || 'Erro ao criar', 'error');
  }
}

async function listarLembretes() {
  const lista = document.getElementById('lista-lembretes');
  const r = await req('GET', '/lembretes');
  if (!r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div>Faça login para ver suas tarefas</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div>Nenhuma tarefa ainda</div>`;
    return;
  }
  lista.innerHTML = r.body.map(l => `
    <div class="lembrete-item">
      <button class="lembrete-check ${l.concluido ? 'done' : ''}" onclick="toggleLembrete(${l.id})">
        ${l.concluido ? '✓' : ''}
      </button>
      <div class="lembrete-info">
        <h4 style="${l.concluido ? 'text-decoration:line-through;opacity:.5' : ''}">${l.titulo}</h4>
        <p>${l.dataVencimento ? new Date(l.dataVencimento).toLocaleString('pt-BR') : 'Sem vencimento'}${l.descricao ? ' · ' + l.descricao : ''}</p>
      </div>
      <span class="prio-badge prio-${l.prioridade}">${l.prioridade}</span>
      <button class="btn-danger" style="padding:5px 10px" onclick="deletarLembrete(${l.id})">🗑</button>
    </div>`).join('');
}

async function toggleLembrete(id) {
  const r = await req('PATCH', `/lembretes/${id}/toggle-concluido`);
  if (r.ok) { listarLembretes(); loadDashTarefas(); }
}

async function deletarLembrete(id) {
  const r = await req('DELETE', `/lembretes/${id}`);
  if (r.ok) { toast('Tarefa removida'); listarLembretes(); loadDashTarefas(); }
  else toast('Erro ao remover', 'error');
}

/* ══════════ MATÉRIAS ══════════ */
const matIcons   = ['🧮', '💾', '🔢', '📝', '⚗️', '🌐', '📐', '🖥️'];
const matPalettes = [
  { bg:'#f3f0ff', text:'#6d28d9', border:'#ddd6fe' },
  { bg:'#fff1f2', text:'#be185d', border:'#fecdd3' },
  { bg:'#f0fdf4', text:'#065f46', border:'#bbf7d0' },
  { bg:'#fffbeb', text:'#92400e', border:'#fde68a' },
  { bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe' },
  { bg:'#fdf4ff', text:'#7e22ce', border:'#e9d5ff' },
];

async function criarMateria() {
  const body = {
    nome:      document.getElementById('mat-nome').value,
    professor: document.getElementById('mat-prof').value || null,
    cargaHor:  parseInt(document.getElementById('mat-carga').value) || null,
    cor:       document.getElementById('mat-cor').value,
  };
  const r = await req('POST', '/materias', body);
  showRes('res-materias', r, r.ok);
  if (r.ok) {
    toast('Matéria criada!');
    closeModal('modal-add-materia');
    listarMaterias();
    loadDashMaterias();
    document.getElementById('mat-nome').value = '';
    document.getElementById('mat-prof').value = '';
  } else {
    toast(r.body.message || 'Erro ao criar', 'error');
  }
}

async function listarMaterias() {
  const lista = document.getElementById('lista-materias');
  const r = await req('GET', '/materias');
  if (!r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔒</div>Faça login para ver suas matérias</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div>Nenhuma matéria ainda</div>`;
    return;
  }
  lista.innerHTML = r.body.map((m, i) => {
    const icon = matIcons[i % matIcons.length];
    const cor  = m.cor || '#7C3AED';
    // Gera bg claro (10% de opacidade) e texto/borda a partir da cor escolhida
    const bg     = cor + '1a'; // hex com alpha ~10%
    const border = cor + '55'; // hex com alpha ~33%
    return `
    <div class="mat-page-card" style="background:${bg};color:${cor};border:1.5px solid ${border}">
      <span class="mat-card-icon">${icon}</span>
      <div class="mat-card-name">${m.nome}</div>
      <div class="mat-card-sub">${m.professor ? 'Prof. ' + m.professor : ''}${m.cargaHor ? (m.professor ? ' · ' : '') + m.cargaHor + 'h' : ''}</div>
      <div class="mat-card-actions">
        <button class="btn-danger" onclick="deletarMateria(${m.id})">🗑 Remover</button>
      </div>
    </div>`;
  }).join('');
}

async function deletarMateria(id) {
  const r = await req('DELETE', `/materias/${id}`);
  if (r.ok) { toast('Matéria removida'); listarMaterias(); loadDashMaterias(); }
  else toast('Erro ao remover', 'error');
}

/* ══════════ CALENDÁRIO ══════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calBigYear  = calYear;
let calBigMonth = calMonth;

// Cache dos lembretes para o calendário
let lembretesPorDia = {}; // chave: "YYYY-MM-DD"

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

async function carregarLembretesCalendario() {
  if (!accessToken) return;
  const r = await req('GET', '/lembretes');
  lembretesPorDia = {};
  if (!r.ok || !Array.isArray(r.body)) return;
  r.body.forEach(l => {
    if (l.dataVencimento) {
      const d = new Date(l.dataVencimento);
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

  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

  let html = DAYS.map(d => `<div class="cal-day-label">${d.slice(0,1)}</div>`).join('');

  // Dias do mês anterior para preencher a primeira semana
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day other-month">${daysInPrev - firstDay + i + 1}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const lems = getLembretesDia(calYear, calMonth, d);
    const dotsHtml = lems.length > 0
      ? `<div class="lem-dots">${lems.slice(0,3).map(() => `<div class="lem-dot"></div>`).join('')}</div>`
      : '';
    html += `<div class="cal-day${isToday ? ' today' : ''}">${d}${dotsHtml}</div>`;
  }

  grid.innerHTML = html;
}

function calMove(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  renderMiniCal();
}

async function renderCalBig() {
  await carregarLembretesCalendario();
  const title = document.getElementById('cal-big-title');
  const grid  = document.getElementById('cal-big-days'); // agora usa id separado
  if (!title || !grid) return;
  title.textContent = `${MONTHS[calBigMonth]} ${calBigYear}`;

  const today = new Date();
  const firstDay = new Date(calBigYear, calBigMonth, 1).getDay();
  const daysInMonth = new Date(calBigYear, calBigMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calBigYear, calBigMonth, 0).getDate();

  let html = '';

  // Dias do mês anterior
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-big-day other-month"><span>${daysInPrev - firstDay + i + 1}</span></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calBigMonth === today.getMonth() && calBigYear === today.getFullYear();
    const lems = getLembretesDia(calBigYear, calBigMonth, d);
    let pillsHtml = '';
    if (lems.length > 0) {
      const pills = lems.slice(0, 2).map(l =>
        `<div class="lem-pill ${l.prioridade || ''}" title="${l.titulo}">${l.titulo}</div>`
      ).join('');
      const extra = lems.length > 2 ? `<div class="lem-pill">+${lems.length - 2}</div>` : '';
      pillsHtml = `<div class="lem-pills">${pills}${extra}</div>`;
    }
    html += `<div class="cal-big-day${isToday ? ' today' : ''}"><span>${d}</span>${pillsHtml}</div>`;
  }

  grid.innerHTML = html;
}

function calBigMove(dir) {
  calBigMonth += dir;
  if (calBigMonth < 0) { calBigMonth = 11; calBigYear--; }
  if (calBigMonth > 11) { calBigMonth = 0;  calBigYear++; }
  renderCalBig();
}

async function criarEvento() {
  const body = {
    titulo:     document.getElementById('ev-titulo').value,
    tipo:       document.getElementById('ev-tipo').value,
    dataInicio: document.getElementById('ev-inicio').value,
    dataFim:    document.getElementById('ev-fim').value   || null,
    descricao:  document.getElementById('ev-desc').value  || null,
    cor:        document.getElementById('ev-cor').value,
  };
  const r = await req('POST', '/calendario', body);
  showRes('res-calendario', r, r.ok);
  if (r.ok) {
    toast('Evento criado!');
    closeModal('modal-add-evento');
    listarEventos();
    document.getElementById('ev-titulo').value = '';
    document.getElementById('ev-desc').value = '';
  } else {
    toast(r.body.message || 'Erro ao criar', 'error');
  }
}

async function listarEventos() {
  const lista = document.getElementById('lista-eventos');
  const r = await req('GET', '/calendario');
  if (!r.ok || !Array.isArray(r.body)) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div>Faça login para ver seus eventos</div>`;
    return;
  }
  if (r.body.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div>Nenhum evento ainda</div>`;
    return;
  }
  lista.innerHTML = r.body.map(e => `
    <div class="evento-item">
      <div class="evento-dot" style="background:${e.cor || '#7C3AED'}"></div>
      <div class="evento-info">
        <h4>${e.titulo}</h4>
        <p>${e.dataInicio ? new Date(e.dataInicio).toLocaleString('pt-BR') : ''}${e.descricao ? ' · ' + e.descricao : ''}</p>
      </div>
      <span class="evento-tipo">${e.tipo}</span>
      <button class="btn-danger" style="padding:5px 10px;margin-left:8px" onclick="deletarEvento(${e.id})">🗑</button>
    </div>`).join('');
}

async function deletarEvento(id) {
  const r = await req('DELETE', `/calendario/${id}`);
  if (r.ok) { toast('Evento removido'); listarEventos(); }
  else toast('Erro ao remover', 'error');
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

const CIRC = 2 * Math.PI * 95;

function pomoFmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function pomoRender() {
  document.getElementById('pomo-clock').textContent  = pomoFmt(pomoRemaining);
  document.getElementById('pomo-phase').textContent  = POMO_MODES[pomoMode].label;
  document.getElementById('pomo-next').textContent   = POMO_MODES[pomoMode].next;
  document.getElementById('pomo-cycles').textContent = pomoCycles;
  document.getElementById('pomo-btn').textContent    = pomoRunning ? '⏸ Parar' : '▶ Iniciar';

  const progress = pomoRemaining / pomoTotal;
  const offset   = CIRC * (1 - progress);
  document.getElementById('pomo-ring').style.strokeDashoffset = offset;

  document.getElementById('stat-foco').textContent   = pomoFocoMin + ' min';
  document.getElementById('stat-pausas').textContent  = String(pomoPausas).padStart(2,'0');
  document.getElementById('stat-ciclos').textContent  = String(pomoCycles).padStart(2,'0');
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
        if (pomoMode === 'foco') pomoSetMode('curta');
        else pomoSetMode('foco');
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
  document.getElementById(map[mode]).classList.add('active');

  pomoRender();
}

function pomoStartFromMini() {
  pomoSetMode('foco');
  pomoToggle();
}

/* ══════════ INIT ══════════ */
updateStatus();
renderMiniCal();
renderCalBig();
loadDashboard();

if (accessToken) {
  carregarPerfil();
}