// Gerador Automático de Clips da Twitch
class TwitchClipGenerator {
    constructor() {
        this.isEnabled = false;
        this.clipHistory = [];
        this.triggers = {
            newFollowers: true,
            viewerSpikes: true,
            chatActivity: true,
            manualTrigger: true
        };
        this.thresholds = {
            followerIncrease: 5,        // Clips quando ganhar 5+ seguidores
            viewerSpike: 50,            // Clips quando viewers aumentar 50+
            chatBurst: 20,              // Clips quando chat muito ativo
            cooldownMinutes: 2          // Tempo mínimo entre clips
        };
        this.lastClipTime = 0;
        this.baselineViewers = 0;
        this.baselineFollowers = 0;
    }

    // Inicializar o gerador de clips
    async initialize() {
        try {
            console.log('🎬 Inicializando gerador de clips...');
            
            // Verificar se o canal está ao vivo
            const channelInfo = await twitchAPI.getChannelInfo();
            if (!channelInfo || !channelInfo.is_live) {
                console.warn('⚠️ Canal não está ao vivo. Clips só funcionam durante streams.');
                return false;
            }

            // Definir valores base
            this.baselineViewers = channelInfo.viewer_count || 0;
            this.baselineFollowers = channelInfo.follower_count || 0;
            
            this.isEnabled = true;
            console.log('✅ Gerador de clips ativado!');
            
            // Criar interface de controle
            this.createClipInterface();
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar gerador de clips:', error);
            return false;
        }
    }

    // Criar interface de controle de clips
    createClipInterface() {
        const clipInterface = document.createElement('div');
        clipInterface.id = 'clip-interface';
        clipInterface.innerHTML = `
            <div class="clip-controls">
                <h4>🎬 Gerador de Clips</h4>
                <div class="clip-status">
                    <span id="clip-status-text">Ativo</span>
                    <button id="manual-clip-btn" onclick="clipGenerator.createManualClip()">
                        Criar Clip Agora
                    </button>
                </div>
                <div class="clip-settings">
                    <label>
                        <input type="checkbox" id="auto-followers" checked>
                        Auto-clip novos seguidores
                    </label>
                    <label>
                        <input type="checkbox" id="auto-viewers" checked>
                        Auto-clip picos de viewers
                    </label>
                    <label>
                        <input type="checkbox" id="auto-chat" checked>
                        Auto-clip chat ativo
                    </label>
                </div>
                <div class="recent-clips">
                    <h5>Clips Recentes:</h5>
                    <div id="clips-list"></div>
                </div>
            </div>
        `;

        // Adicionar estilos
        const style = document.createElement('style');
        style.textContent = `
            .clip-controls {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #9146ff;
                border-radius: 10px;
                padding: 15px;
                color: white;
                font-family: 'Roboto', sans-serif;
                min-width: 250px;
                z-index: 1001;
                backdrop-filter: blur(10px);
            }
            
            .clip-controls h4 {
                margin: 0 0 10px 0;
                color: #9146ff;
                text-align: center;
            }
            
            .clip-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            #manual-clip-btn {
                background: linear-gradient(135deg, #9146ff, #00ff88);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: transform 0.2s;
            }
            
            #manual-clip-btn:hover {
                transform: scale(1.05);
            }
            
            #manual-clip-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .clip-settings {
                margin-bottom: 15px;
            }
            
            .clip-settings label {
                display: block;
                margin-bottom: 5px;
                font-size: 12px;
                cursor: pointer;
            }
            
            .clip-settings input[type="checkbox"] {
                margin-right: 8px;
            }
            
            .recent-clips h5 {
                margin: 0 0 8px 0;
                color: #ffd700;
                font-size: 12px;
            }
            
            #clips-list {
                max-height: 150px;
                overflow-y: auto;
                font-size: 11px;
            }
            
            .clip-item {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
                padding: 8px;
                margin-bottom: 5px;
                border-left: 3px solid #00ff88;
            }
            
            .clip-item .clip-title {
                font-weight: bold;
                color: #00ff88;
                margin-bottom: 3px;
            }
            
            .clip-item .clip-info {
                color: #ccc;
                font-size: 10px;
            }
            
            .clip-item .clip-url {
                color: #9146ff;
                text-decoration: none;
                font-size: 10px;
            }
            
            .clip-item .clip-url:hover {
                text-decoration: underline;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(clipInterface);

        // Configurar event listeners
        this.setupEventListeners();
    }

    // Configurar event listeners
    setupEventListeners() {
        document.getElementById('auto-followers').addEventListener('change', (e) => {
            this.triggers.newFollowers = e.target.checked;
        });

        document.getElementById('auto-viewers').addEventListener('change', (e) => {
            this.triggers.viewerSpikes = e.target.checked;
        });

        document.getElementById('auto-chat').addEventListener('change', (e) => {
            this.triggers.chatActivity = e.target.checked;
        });
    }

    // Verificar se deve criar um clip automaticamente
    async checkAutoClipTriggers(channelInfo) {
        if (!this.isEnabled || !channelInfo || !channelInfo.is_live) {
            return;
        }

        const now = Date.now();
        const cooldownMs = this.thresholds.cooldownMinutes * 60 * 1000;

        // Verificar cooldown
        if (now - this.lastClipTime < cooldownMs) {
            return;
        }

        let shouldClip = false;
        let reason = '';

        // Trigger 1: Novos seguidores
        if (this.triggers.newFollowers) {
            const followerIncrease = channelInfo.follower_count - this.baselineFollowers;
            if (followerIncrease >= this.thresholds.followerIncrease) {
                shouldClip = true;
                reason = `${followerIncrease} novos seguidores!`;
                this.baselineFollowers = channelInfo.follower_count;
            }
        }

        // Trigger 2: Pico de viewers
        if (this.triggers.viewerSpikes && !shouldClip) {
            const viewerIncrease = channelInfo.viewer_count - this.baselineViewers;
            if (viewerIncrease >= this.thresholds.viewerSpike) {
                shouldClip = true;
                reason = `Pico de ${viewerIncrease} viewers!`;
                this.baselineViewers = channelInfo.viewer_count;
            }
        }

        // Criar clip se algum trigger foi ativado
        if (shouldClip) {
            await this.createAutoClip(reason);
        }
    }

    // Criar clip automático
    async createAutoClip(reason) {
        try {
            const clip = await this.createClip(`Auto-clip: ${reason}`);
            if (clip) {
                console.log(`🎬 Clip automático criado: ${reason}`);
                this.showClipNotification(`Clip criado: ${reason}`, clip.edit_url);
            }
        } catch (error) {
            console.error('❌ Erro ao criar clip automático:', error);
        }
    }

    // Criar clip manual
    async createManualClip() {
        const button = document.getElementById('manual-clip-btn');
        button.disabled = true;
        button.textContent = 'Criando...';

        try {
            const clip = await this.createClip('Clip manual');
            if (clip) {
                this.showClipNotification('Clip manual criado!', clip.edit_url);
            }
        } catch (error) {
            console.error('❌ Erro ao criar clip manual:', error);
            alert('Erro ao criar clip. Verifique o console para detalhes.');
        } finally {
            button.disabled = false;
            button.textContent = 'Criar Clip Agora';
        }
    }

    // Função principal para criar clips
    async createClip(title) {
        try {
            // Verificar se o canal está ao vivo
            const channelInfo = await twitchAPI.getChannelInfo();
            if (!channelInfo || !channelInfo.is_live) {
                throw new Error('Canal não está ao vivo');
            }

            // Criar clip via API da Twitch
            const clipData = await twitchAPI.createClip(channelInfo.id, false);

            if (clipData) {
                // Adicionar à lista de clips
                const clipInfo = {
                    id: clipData.id,
                    edit_url: clipData.edit_url,
                    title: title,
                    created_at: new Date().toISOString(),
                    broadcaster_name: channelInfo.display_name
                };

                this.clipHistory.unshift(clipInfo);
                this.updateClipsList();
                this.lastClipTime = Date.now();

                return clipInfo;
            } else {
                throw new Error('Resposta inválida da API');
            }
        } catch (error) {
            console.error('❌ Erro ao criar clip:', error);
            throw error;
        }
    }

    // Atualizar lista de clips na interface
    updateClipsList() {
        const clipsList = document.getElementById('clips-list');
        if (!clipsList) return;

        clipsList.innerHTML = '';

        this.clipHistory.slice(0, 5).forEach(clip => {
            const clipElement = document.createElement('div');
            clipElement.className = 'clip-item';
            
            const timeAgo = this.getTimeAgo(new Date(clip.created_at));
            
            clipElement.innerHTML = `
                <div class="clip-title">${clip.title}</div>
                <div class="clip-info">${timeAgo}</div>
                <a href="${clip.edit_url}" target="_blank" class="clip-url">
                    Editar Clip
                </a>
            `;
            
            clipsList.appendChild(clipElement);
        });
    }

    // Mostrar notificação de clip criado
    showClipNotification(message, editUrl) {
        const notification = document.createElement('div');
        notification.className = 'clip-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">🎬</span>
                <span class="notification-text">${message}</span>
                <a href="${editUrl}" target="_blank" class="notification-link">Editar</a>
            </div>
        `;

        // Estilos da notificação
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #9146ff, #00ff88);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-family: 'Roboto', sans-serif;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: clipNotificationAnim 4s ease-in-out;
        `;

        // Adicionar animação CSS
        if (!document.getElementById('clip-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'clip-notification-styles';
            style.textContent = `
                @keyframes clipNotificationAnim {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .notification-link {
                    color: white;
                    text-decoration: underline;
                    font-size: 0.9em;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remover notificação após animação
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    // Calcular tempo decorrido
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h atrás`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d atrás`;
    }

    // Parar o gerador de clips
    stop() {
        this.isEnabled = false;
        const clipInterface = document.getElementById('clip-interface');
        if (clipInterface) {
            clipInterface.remove();
        }
        console.log('🛑 Gerador de clips parado');
    }
}

// Instância global do gerador de clips
const clipGenerator = new TwitchClipGenerator(); 