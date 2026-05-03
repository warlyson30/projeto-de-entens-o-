/**
 * EXEMPLOS PRÁTICOS - JWT
 * =======================
 * 
 * Execute estes exemplos para testar o JWT
 * Salve este arquivo como test-jwt.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Cores para output no console
const cores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
};

function log(cor, titulo, dados) {
  console.log(`\n${cor}═══════════════════════════════════════${cores.reset}`);
  console.log(`${cor}${titulo}${cores.reset}`);
  console.log(`${cor}═══════════════════════════════════════${cores.reset}`);
  console.log(JSON.stringify(dados, null, 2));
}

// ============================================================
// 1. TESTE COMPLETO DO JWT
// ============================================================

async function testeCompleto() {
  try {
    // 1️⃣ Registrar novo usuário
    log(cores.amarelo, '1️⃣ REGISTRANDO NOVO USUÁRIO', {});
    
    const registroRes = await axios.post(`${BASE_URL}/auth/registro`, {
      nome: 'João Silva',
      email: `joao${Date.now()}@email.com`, // Email único por timestamp
      senha: 'senha123',
    });

    log(cores.verde, '✅ REGISTRO SUCESSO', registroRes.data);
    
    const { accessToken, refreshToken } = registroRes.data.tokens;
    const usuarioId = registroRes.data.usuario.id;

    // 2️⃣ Usar access token
    log(cores.amarelo, '2️⃣ USANDO ACCESS TOKEN', {});
    
    const perfilRes = await axios.get(`${BASE_URL}/auth/perfil`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    log(cores.verde, '✅ PERFIL CARREGADO', perfilRes.data);

    // 3️⃣ Ver informações do token
    log(cores.amarelo, '3️⃣ INFORMAÇÕES DO TOKEN', {});
    
    const infoRes = await axios.get(`${BASE_URL}/auth/info-token`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    log(cores.verde, '✅ INFO TOKEN', infoRes.data);

    // 4️⃣ Renovar token
    log(cores.amarelo, '4️⃣ RENOVANDO TOKEN', {});
    
    const renovarRes = await axios.post(`${BASE_URL}/auth/renovar`, {
      refreshToken,
    });

    log(cores.verde, '✅ TOKEN RENOVADO', renovarRes.data);

    // 5️⃣ Token expirado (simular)
    log(cores.amarelo, '5️⃣ TESTANDO TOKEN INVÁLIDO', {});
    
    try {
      await axios.get(`${BASE_URL}/auth/perfil`, {
        headers: { 'Authorization': 'Bearer token_invalido' },
      });
    } catch (err) {
      log(cores.vermelho, '❌ ESPERADO - TOKEN INVÁLIDO', {
        status: err.response.status,
        erro: err.response.data.erro,
      });
    }

    // 6️⃣ Sem token
    log(cores.amarelo, '6️⃣ TESTANDO SEM TOKEN', {});
    
    try {
      await axios.get(`${BASE_URL}/auth/perfil`);
    } catch (err) {
      log(cores.vermelho, '❌ ESPERADO - SEM TOKEN', {
        status: err.response.status,
        erro: err.response.data.erro,
      });
    }

    // 7️⃣ Logout
    log(cores.amarelo, '7️⃣ LOGOUT', {});
    
    const logoutRes = await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    log(cores.verde, '✅ LOGOUT', logoutRes.data);

  } catch (err) {
    log(cores.vermelho, '❌ ERRO', {
      status: err.response?.status,
      erro: err.response?.data || err.message,
    });
  }
}

// ============================================================
// 2. TESTE DE LOGIN
// ============================================================

async function testeLogin() {
  try {
    log(cores.amarelo, 'TESTE DE LOGIN', {});

    // Registrar primeiro
    const email = `user${Date.now()}@email.com`;
    const senha = 'senha123';

    await axios.post(`${BASE_URL}/auth/registro`, {
      nome: 'Usuário Teste',
      email,
      senha,
    });

    // Depois fazer login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      senha,
    });

    log(cores.verde, '✅ LOGIN SUCESSO', loginRes.data);

  } catch (err) {
    log(cores.vermelho, '❌ ERRO', err.response?.data || err.message);
  }
}

// ============================================================
// 3. TESTE DE CREDENCIAIS INVÁLIDAS
// ============================================================

async function testeCredenciaisInvalidas() {
  try {
    log(cores.amarelo, 'TESTE: CREDENCIAIS INVÁLIDAS', {});

    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'naoexiste@email.com',
      senha: 'senhaerrada',
    });

  } catch (err) {
    log(cores.vermelho, '❌ ESPERADO - CREDENCIAIS INVÁLIDAS', {
      status: err.response.status,
      erro: err.response.data.erro,
    });
  }
}

// ============================================================
// 4. TESTE DE VALIDAÇÕES
// ============================================================

async function testeValidacoes() {
  try {
    log(cores.amarelo, 'TESTE: EMAIL INVÁLIDO', {});

    await axios.post(`${BASE_URL}/auth/registro`, {
      nome: 'Teste',
      email: 'email_invalido',
      senha: 'senha123',
    });

  } catch (err) {
    log(cores.vermelho, '❌ ESPERADO - EMAIL INVÁLIDO', {
      status: err.response.status,
      erro: err.response.data.erro,
    });
  }

  try {
    log(cores.amarelo, 'TESTE: SENHA MUITO CURTA', {});

    await axios.post(`${BASE_URL}/auth/registro`, {
      nome: 'Teste',
      email: `valido${Date.now()}@email.com`,
      senha: '123',
    });

  } catch (err) {
    log(cores.vermelho, '❌ ESPERADO - SENHA CURTA', {
      status: err.response.status,
      erro: err.response.data.erro,
    });
  }
}

// ============================================================
// 5. TESTE DE RENOVAÇÃO
// ============================================================

async function testeRenovacao() {
  try {
    log(cores.amarelo, 'TESTE: RENOVAÇÃO DE TOKEN', {});

    // Registrar
    const registroRes = await axios.post(`${BASE_URL}/auth/registro`, {
      nome: 'Teste Renovação',
      email: `renovacao${Date.now()}@email.com`,
      senha: 'senha123',
    });

    const { refreshToken } = registroRes.data.tokens;
    log(cores.verde, '✅ REFRESH TOKEN RECEBIDO', { refreshToken });

    // Renovar
    const renovarRes = await axios.post(`${BASE_URL}/auth/renovar`, {
      refreshToken,
    });

    log(cores.verde, '✅ NOVO ACCESS TOKEN', {
      novoAccessToken: renovarRes.data.tokens.accessToken.substring(0, 50) + '...',
    });

  } catch (err) {
    log(cores.vermelho, '❌ ERRO', err.response?.data || err.message);
  }
}

// ============================================================
// EXECUTAR TESTES
// ============================================================

async function executarTodos() {
  console.log('\n\n');
  console.log(cores.azul);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      TESTES COMPLETOS DO SISTEMA JWT           ║');
  console.log('║           Academic API - v1.0.0                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(cores.reset);

  await testeCompleto();
  await new Promise(r => setTimeout(r, 1000));

  await testeLogin();
  await new Promise(r => setTimeout(r, 1000));

  await testeCredenciaisInvalidas();
  await new Promise(r => setTimeout(r, 1000));

  await testeValidacoes();
  await new Promise(r => setTimeout(r, 1000));

  await testeRenovacao();

  console.log('\n\n');
  console.log(cores.verde);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║              ✅ TESTES FINALIZADOS             ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(cores.reset);
  console.log('\n');
}

// Rodar testes
executarTodos().catch(console.error);

// ============================================================
// EXPORTS para uso em outros arquivos
// ============================================================

module.exports = {
  testeCompleto,
  testeLogin,
  testeCredenciaisInvalidas,
  testeValidacoes,
  testeRenovacao,
};
