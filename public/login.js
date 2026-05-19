/* ══════════════════════════════════════════
   login.js  — autenticação
   Compatível com index.js (Node/Express)
══════════════════════════════════════════ */

const BASE = ''; // mesmo origin — arquivos servidos pelo Express em /public

/* ── utils ── */
async function req(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(BASE + path, opts);
    const json = await r.json();
    return { status: r.status, body: json, ok: r.ok };
  } catch (e) {
    return { status: 0, body: { message: 'Servidor inacessível.' }, ok: false };
  }
}

function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showMsg(id, msg, isOk) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  el.innerHTML = `<div class="res-header ${isOk ? 'ok' : 'err'}">${isOk ? '✅' : '❌'} ${msg}</div>`;
}

function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); el.innerHTML = ''; }
}

/* ── navegação entre telas ── */
function showLogin() {
  document.getElementById('auth-login').style.display    = 'flex';
  document.getElementById('auth-register').style.display = 'none';
  clearMsg('res-auth');
}

function showRegister() {
  document.getElementById('auth-login').style.display    = 'none';
  document.getElementById('auth-register').style.display = 'flex';
  clearMsg('msg-register');
}

/* ── guard: já logado → vai direto ao app ── */
if (localStorage.getItem('accessToken')) {
  window.location.replace('app.html');
}

/* ══════════ LOGIN ══════════
   POST /login
   Body : { username, password }
   200  : { accessToken, refreshToken, tokenType, expiresIn }
   400/401 : { message }
*/
async function login() {
  clearMsg('res-auth');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showMsg('res-auth', 'Preencha usuário e senha.', false);
    return;
  }

  const btn = document.querySelector('#auth-login .auth-btn-primary');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const r = await req('POST', '/login', { username, password });

  btn.disabled = false;
  btn.textContent = '⊕ Entrar';

  if (r.ok) {
    localStorage.setItem('accessToken',  r.body.accessToken);
    localStorage.setItem('refreshToken', r.body.refreshToken);
    window.location.href = 'app.html';
  } else {
    showMsg('res-auth', r.body.message || 'Credenciais inválidas.', false);
  }
}

/* ══════════ REGISTRO ══════════
   POST /register
   Body : { username, password, name }
   201  : { message, user: { id, username, name } }
   400  : { message }
   409  : { message }  (username já existe)
*/
async function registrar() {
  clearMsg('msg-register');
  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-password-confirm').value;

  if (!name || !username || !password) {
    showMsg('msg-register', 'Preencha todos os campos.', false);
    return;
  }
  if (username.length < 3) {
    showMsg('msg-register', 'O usuário deve ter pelo menos 3 caracteres.', false);
    return;
  }
  if (password.length < 6) {
    showMsg('msg-register', 'A senha deve ter pelo menos 6 caracteres.', false);
    return;
  }
  if (password !== confirm) {
    showMsg('msg-register', 'As senhas não coincidem.', false);
    return;
  }

  const btn = document.querySelector('#auth-register .auth-btn-primary');
  btn.disabled = true;
  btn.textContent = 'Criando conta...';

  const r = await req('POST', '/register', { username, password, name });

  btn.disabled = false;
  btn.textContent = '⊕ Criar conta';

  if (r.ok) {
    showMsg('msg-register', 'Conta criada! Redirecionando para o login...', true);
    setTimeout(showLogin, 1500);
  } else {
    showMsg('msg-register', r.body.message || 'Erro ao criar conta.', false);
  }
}

/* ── Enter para submeter ── */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('auth-login').style.display !== 'none';
  if (loginVisible) login();
  else registrar();
});
