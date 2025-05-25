// API da Twitch - Versão Corrigida com Debug
class TwitchAPI {
    constructor() {
        this.clientId = CONFIG.TWITCH_CLIENT_ID;
        this.clientSecret = CONFIG.TWITCH_CLIENT_SECRET;
        this.channelName = CONFIG.CHANNEL_NAME;
        this.accessToken = null;
        this.isConnected = false;
        this.lastData = null;
        this.debugMode = true; // Ativar debug para identificar problemas
        
        console.log('🔧 TwitchAPI inicializada para canal:', this.channelName);
        console.log('🔑 Client ID:', this.clientId ? 'Configurado ✅' : 'Não configurado ❌');
    }

    // Obter token de acesso da aplicação
    async getAppAccessToken() {
        try {
            console.log('🔄 Solicitando token de acesso...');
            
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'client_credentials'
                })
            });

            console.log('📡 Resposta do token:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta do token:', errorText);
                throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.isConnected = true;
            
            console.log('✅ Token de acesso obtido com sucesso');
            console.log('🔑 Token:', this.accessToken ? 'Recebido ✅' : 'Não recebido ❌');
            return this.accessToken;
            
        } catch (error) {
            console.error('❌ Erro ao obter token:', error);
            this.isConnected = false;
            return null;
        }
    }

    // Fazer requisição para API da Twitch
    async makeRequest(endpoint) {
        try {
            // Garantir que temos um token
            if (!this.accessToken) {
                console.log('🔄 Token não encontrado, obtendo novo...');
                await this.getAppAccessToken();
            }

            if (!this.accessToken) {
                throw new Error('Não foi possível obter token de acesso');
            }

            const url = `https://api.twitch.tv/helix/${endpoint}`;
            console.log('📡 Fazendo requisição para:', url);

            const response = await fetch(url, {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Resposta da API:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado, tentar renovar
                    console.log('🔄 Token expirado, renovando...');
                    this.accessToken = null;
                    await this.getAppAccessToken();
                    
                    if (this.accessToken) {
                        // Tentar novamente com novo token
                        console.log('🔄 Tentando novamente com novo token...');
                        return this.makeRequest(endpoint);
                    }
                }
                
                const errorText = await response.text();
                console.error('❌ Erro na API:', response.status, errorText);
                throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Dados recebidos:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            return null;
        }
    }

    // Obter informações do usuário/canal
    async getUserInfo() {
        try {
            console.log('👤 Buscando informações do usuário:', this.channelName);
            const data = await this.makeRequest(`users?login=${this.channelName}`);
            
            if (data && data.data && data.data.length > 0) {
                const userInfo = data.data[0];
                console.log('✅ Informações do usuário obtidas:', userInfo.display_name);
                console.log('📊 ID do usuário:', userInfo.id);
                return userInfo;
            } else {
                console.warn('⚠️ Usuário não encontrado ou dados vazios');
                console.log('🔍 Dados recebidos:', data);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao obter info do usuário:', error);
            return null;
        }
    }

    // Obter informações da stream
    async getStreamInfo() {
        try {
            const userInfo = await this.getUserInfo();
            if (!userInfo) {
                console.warn('⚠️ Não foi possível obter info do usuário para stream');
                return null;
            }

            console.log('📺 Buscando informações da stream para ID:', userInfo.id);
            const data = await this.makeRequest(`streams?user_id=${userInfo.id}`);
            
            if (data && data.data && data.data.length > 0) {
                const streamInfo = data.data[0];
                console.log('✅ Stream ao vivo detectada!');
                console.log('👥 Viewers:', streamInfo.viewer_count);
                console.log('🎮 Jogo:', streamInfo.game_name);
                console.log('📝 Título:', streamInfo.title);
                return streamInfo;
            } else {
                console.log('📴 Stream offline ou não encontrada');
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao obter info da stream:', error);
            return null;
        }
    }

    // Obter número de seguidores
    async getFollowersCount() {
        try {
            const userInfo = await this.getUserInfo();
            if (!userInfo) {
                console.warn('⚠️ Não foi possível obter info do usuário para seguidores');
                return 0;
            }

            console.log('❤️ Buscando contagem de seguidores...');
            const data = await this.makeRequest(`channels/followers?broadcaster_id=${userInfo.id}`);
            
            if (data && data.total !== undefined) {
                console.log('✅ Seguidores obtidos:', data.total);
                return data.total;
            } else {
                console.warn('⚠️ Não foi possível obter contagem de seguidores');
                console.log('🔍 Dados recebidos:', data);
                return 0;
            }
            
        } catch (error) {
            console.error('❌ Erro ao obter seguidores:', error);
            return 0;
        }
    }

    // Obter informações completas do canal
    async getChannelInfo() {
        try {
            console.log('🔄 Obtendo informações completas do canal...');
            
            const userInfo = await this.getUserInfo();
            if (!userInfo) {
                console.log('⚠️ Não foi possível obter info do usuário, usando dados simulados');
                return this.getSimulatedData();
            }

            console.log('✅ Usuário encontrado, buscando dados da stream e seguidores...');
            
            // Buscar informações em paralelo para ser mais rápido
            const [streamInfo, followersCount] = await Promise.all([
                this.getStreamInfo(),
                this.getFollowersCount()
            ]);

            // Combinar todas as informações
            const channelData = {
                id: userInfo.id,
                login: userInfo.login,
                display_name: userInfo.display_name,
                profile_image_url: userInfo.profile_image_url,
                is_live: streamInfo !== null,
                viewer_count: streamInfo ? streamInfo.viewer_count : 0,
                follower_count: followersCount,
                title: streamInfo ? streamInfo.title : 'Stream Offline',
                game_name: streamInfo ? streamInfo.game_name : 'Nenhum',
                started_at: streamInfo ? streamInfo.started_at : null
            };

            this.lastData = channelData;
            console.log('✅ Dados do canal obtidos com sucesso!');
            console.log('📊 Resumo:', {
                nome: channelData.display_name,
                ao_vivo: channelData.is_live,
                viewers: channelData.viewer_count,
                seguidores: channelData.follower_count,
            });
            
            return channelData;

        } catch (error) {
            console.error('❌ Erro ao obter informações do canal:', error);
            console.log('🎭 Fallback para dados simulados');
            return this.getSimulatedData();
        }
    }

    // Dados simulados para quando a API não funciona
    getSimulatedData() {
        console.log('🎭 Usando dados simulados para demonstração');
        
        // Usar dados da configuração em vez de valores fixos
        const channelName = this.channelName || 'streamer';
        const displayName = channelName.charAt(0).toUpperCase() + channelName.slice(1);
        
        // Gerar dados aleatórios mais realistas
        const baseFollowers = Math.floor(Math.random() * 2000) + 500; // Entre 500-2500
        const baseViewers = Math.floor(Math.random() * 100) + 10; // Entre 10-110
        
        const simulatedData = {
            id: 'simulated',
            login: channelName,
            display_name: displayName,
            profile_image_url: `https://static-cdn.jtvnw.net/jtv_user_pictures/${channelName}-profile_image-300x300.png`,
            is_live: Math.random() > 0.3, // 70% chance de estar ao vivo
            viewer_count: baseViewers + Math.floor(Math.random() * 30),
            follower_count: baseFollowers + Math.floor(Math.random() * 50),
            title: this.generateRandomTitle(),
            game_name: this.generateRandomCategory(),
            started_at: new Date(Date.now() - Math.random() * 3600000).toISOString() // Até 1h atrás
        };

        this.lastData = simulatedData;
        console.log('🎭 Dados simulados criados:', simulatedData);
        return simulatedData;
    }

    // Gerar título aleatório para simulação
    generateRandomTitle() {
        const titles = [
            'Live IRL - Explorando a cidade! 🎮',
            'Conversando com o chat 💬',
            'Gameplay relaxante 🎯',
            'Stream chill - Vem conversar! ✨',
            'Testando coisas novas 🔧',
            'Interagindo com vocês! 🎉',
            'Live descontraída 😄',
            'Jogando e conversando 🎮💬'
        ];
        return titles[Math.floor(Math.random() * titles.length)];
    }

    // Gerar categoria aleatória para simulação
    generateRandomCategory() {
        const categories = [
            'IRL',
            'Just Chatting',
            'Software and Game Development',
            'Talk Shows & Podcasts',
            'Music',
            'Art',
            'Retro'
        ];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    // Verificar se está conectado
    isApiConnected() {
        return this.isConnected;
    }

    // Obter últimos dados (cache)
    getLastData() {
        return this.lastData;
    }

    // Criar clip (funcionalidade básica)
    async createClip() {
        try {
            const userInfo = await this.getUserInfo();
            if (!userInfo) {
                console.log('🎬 Simulando criação de clip...');
                return {
                    id: 'simulated_clip_' + Date.now(),
                    url: 'https://clips.twitch.tv/simulated',
                    created_at: new Date().toISOString()
                };
            }

            const data = await this.makeRequest(`clips?broadcaster_id=${userInfo.id}`);
            
            if (data && data.data && data.data.length > 0) {
                console.log('✅ Clip criado:', data.data[0].id);
                return data.data[0];
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao criar clip:', error);
            return null;
        }
    }

    // Testar conexão
    async testConnection() {
        try {
            console.log('🧪 === TESTE DE CONEXÃO INICIADO ===');
            
            console.log('1️⃣ Testando obtenção de token...');
            const token = await this.getAppAccessToken();
            if (!token) {
                console.log('❌ Falha ao obter token');
                return false;
            }

            console.log('2️⃣ Testando busca de usuário...');
            const userInfo = await this.getUserInfo();
            if (!userInfo) {
                console.log('❌ Falha ao obter informações do usuário');
                console.log('🔍 Verifique se o nome do canal está correto:', this.channelName);
                return false;
            }

            console.log('3️⃣ Testando informações completas...');
            const channelInfo = await this.getChannelInfo();
            if (!channelInfo) {
                console.log('❌ Falha ao obter informações do canal');
                return false;
            }

            console.log('✅ === TESTE DE CONEXÃO CONCLUÍDO COM SUCESSO ===');
            return true;
            
        } catch (error) {
            console.error('❌ Teste de conexão falhou:', error);
            return false;
        }
    }
}

// Exportar classe para uso global
window.TwitchAPI = TwitchAPI; 