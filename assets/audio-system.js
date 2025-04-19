/**
 * ORION PDV - Sistema de Áudio
 * Este módulo gerencia os efeitos sonoros do sistema
 */

const audioSystem = {
    // Armazena o contexto de áudio
    context: null,
    
    // Sons predefinidos
    sounds: {
        // Som de sucesso: bipe agudo e curto
        success: {
            type: 'sine', // onda senoidal (som suave)
            frequency: 1200, // frequência alta = som agudo
            duration: 0.15, // duração curta
            gain: 0.3, // volume moderado
            fadeIn: 0.01,
            fadeOut: 0.05
        },
        
        // Som de erro: bipe grave e mais longo
        error: {
            type: 'triangle', // onda triangular (som um pouco mais áspero)
            frequency: 300, // frequência baixa = som grave
            duration: 0.3, // duração mais longa
            gain: 0.4, // volume um pouco mais alto
            fadeIn: 0.01,
            fadeOut: 0.1
        },
        
        // Som de alerta: dois bipes curtos
        alert: {
            type: 'square', // onda quadrada (som mais marcante)
            frequency: 800, // frequência média
            duration: 0.1, // duração curta
            repeat: 2, // repete 2 vezes
            gap: 0.1, // intervalo entre repetições
            gain: 0.2,
            fadeIn: 0.01,
            fadeOut: 0.03
        },
        
        // Som de escaneamento: bipe de confirmação
        scan: {
            type: 'sine',
            frequency: 880, // Lá (A4)
            duration: 0.1,
            gain: 0.25,
            fadeIn: 0.01,
            fadeOut: 0.03
        }
    },
    
    // Inicializar o sistema de áudio
    init: function() {
        try {
            // Tentar criar o contexto de áudio (com fallback para navegadores mais antigos)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            
            if (AudioContext) {
                this.context = new AudioContext();
                console.log('Sistema de áudio inicializado');
                return true;
            } else {
                console.warn('Web Audio API não suportada neste navegador');
                return false;
            }
        } catch (error) {
            console.error('Erro ao inicializar sistema de áudio:', error);
            return false;
        }
    },
    
    // Tocar um som pré-definido
    play: function(soundName) {
        // Se o sistema não foi inicializado, inicializa
        if (!this.context) {
            if (!this.init()) {
                return false; // Se não conseguir inicializar, retorna falso
            }
        }
        
        // Verificar se o som existe
        if (!this.sounds[soundName]) {
            console.warn(`Som '${soundName}' não encontrado`);
            return false;
        }
        
        try {
            const sound = this.sounds[soundName];
            
            // Se tem repetições, tocar múltiplas vezes
            if (sound.repeat && sound.repeat > 1) {
                this._playRepeated(sound);
            } else {
                this._playSound(sound);
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao reproduzir som:', error);
            return false;
        }
    },
    
    // Reproduz um único som (função interna)
    _playSound: function(sound) {
        // Criar oscilador
        const oscillator = this.context.createOscillator();
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.frequency, this.context.currentTime);
        
        // Criar nó de ganho (volume)
        const gainNode = this.context.createGain();
        
        // Configurar envelope de volume (para evitar cliques e estouros)
        gainNode.gain.setValueAtTime(0, this.context.currentTime);
        
        // Fade in
        gainNode.gain.linearRampToValueAtTime(
            sound.gain, 
            this.context.currentTime + sound.fadeIn
        );
        
        // Fade out
        gainNode.gain.linearRampToValueAtTime(
            0, 
            this.context.currentTime + sound.duration
        );
        
        // Conectar oscilador -> ganho -> saída
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        // Tocar som
        oscillator.start();
        oscillator.stop(this.context.currentTime + sound.duration);
    },
    
    // Reproduz um som repetidamente (função interna)
    _playRepeated: function(sound) {
        // Calcular duração total (duração do som * repetições + intervalo * (repetições-1))
        const totalDuration = (sound.duration * sound.repeat) + 
                              (sound.gap * (sound.repeat - 1));
        
        // Tocar cada repetição
        for (let i = 0; i < sound.repeat; i++) {
            // Calcular o tempo de início para esta repetição
            const startTime = this.context.currentTime + 
                              (i * (sound.duration + sound.gap));
            
            // Criar oscilador para esta repetição
            const oscillator = this.context.createOscillator();
            oscillator.type = sound.type;
            oscillator.frequency.setValueAtTime(sound.frequency, startTime);
            
            // Criar nó de ganho
            const gainNode = this.context.createGain();
            
            // Configurar envelope
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(
                sound.gain, 
                startTime + sound.fadeIn
            );
            gainNode.gain.linearRampToValueAtTime(
                0, 
                startTime + sound.duration
            );
            
            // Conectar oscilador -> ganho -> saída
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            // Tocar som
            oscillator.start(startTime);
            oscillator.stop(startTime + sound.duration);
        }
    },
    
    // Adicionar um novo som ao sistema
    addSound: function(name, config) {
        // Configuração básica padrão
        const defaults = {
            type: 'sine',
            frequency: 440,
            duration: 0.2,
            gain: 0.3,
            fadeIn: 0.01,
            fadeOut: 0.05
        };
        
        // Mesclar configuração padrão com a fornecida
        this.sounds[name] = Object.assign({}, defaults, config);
        return true;
    },
    
    // Limpar/reset do sistema de áudio
    reset: function() {
        if (this.context) {
            this.context.close().then(() => {
                this.context = null;
                console.log('Sistema de áudio reiniciado');
            }).catch(error => {
                console.error('Erro ao reiniciar sistema de áudio:', error);
            });
        }
    }
};

// Iniciar automaticamente o sistema de áudio quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    audioSystem.init();
});

// Exportar o objeto para uso global
window.audioSystem = audioSystem;
