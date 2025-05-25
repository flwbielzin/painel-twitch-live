// Configurações da API da Twitch - Versão Corrigida
const CONFIG = {
    // Credenciais da Twitch
    TWITCH_CLIENT_ID: '0l2lo79eb0lyrx16oulgss85h11e3v',
    TWITCH_CLIENT_SECRET: 'wwkph643l9fjxsthmdwsj1a3rqj1r7',
    CHANNEL_NAME: 'flwbielzin', // Corrigido: removido o 'n' extra
    
    // URLs da API da Twitch
    API_BASE_URL: 'https://api.twitch.tv/helix',
    OAUTH_URL: 'https://id.twitch.tv/oauth2/token',
    
    // Configurações de atualização (em milissegundos)
    UPDATE_INTERVALS: {
        CHANNEL_INFO: 30000,    // 30 segundos
        FOLLOWERS: 60000,       // 1 minuto
        VIEWERS: 10000,         // 10 segundos
        CHAT: 5000              // 5 segundos
    }
};

// Compatibilidade com código antigo
const TWITCH_CONFIG = CONFIG;

// Token de acesso (será preenchido automaticamente)
let ACCESS_TOKEN = null;

// Log de inicialização
console.log(`
📱 OVERLAY MOBILE TWITCH CONFIGURADO! 📱

✅ Configuração:
CLIENT_ID: ${CONFIG.TWITCH_CLIENT_ID}
CLIENT_SECRET: Configurado ✅
CHANNEL_NAME: ${CONFIG.CHANNEL_NAME}

🔄 Testando conexão com API da Twitch...
`); 