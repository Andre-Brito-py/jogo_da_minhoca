// Configurações do jogo
const GAME_CONFIG = {
    CANVAS_SIZE: 400,
    GRID_SIZE: 20,
    INITIAL_SPEED: 100,
    SPEED_INCREASE: 5,
    POINTS_PER_FOOD: 10,
    LEVEL_UP_SCORE: 100
};

// Estado do jogo
class GameState {
    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        this.isPaused = false;
        this.isGameRunning = false;
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.snake = [{ x: 200, y: 200 }];
        this.direction = { x: 0, y: 0 };
        this.food = this.generateFood();
        this.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        this.isPaused = false;
        this.isGameRunning = false;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * (GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE)) * GAME_CONFIG.GRID_SIZE,
                y: Math.floor(Math.random() * (GAME_CONFIG.CANVAS_SIZE / GAME_CONFIG.GRID_SIZE)) * GAME_CONFIG.GRID_SIZE
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }

    updateScore(points) {
        this.score += points;
        const newLevel = Math.floor(this.score / GAME_CONFIG.LEVEL_UP_SCORE) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.gameSpeed = Math.max(50, GAME_CONFIG.INITIAL_SPEED - (this.level - 1) * GAME_CONFIG.SPEED_INCREASE);
            this.showLevelUpEffect();
        }
        this.updateUI();
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore.toString());
            return true;
        }
        return false;
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('highScore').textContent = this.highScore;
    }

    showLevelUpEffect() {
        const canvas = document.getElementById('gameCanvas');
        canvas.classList.add('flash');
        setTimeout(() => canvas.classList.remove('flash'), 300);
        
        // Efeito sonoro simulado
        this.playSound('levelup');
    }

    playSound(type) {
        // Simulação de efeitos sonoros com Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'eat':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'gameover':
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'levelup':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
        }
    }
}

// Classe principal do jogo
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = new GameState();
        this.gameLoop = null;
        this.lastRenderTime = 0;
        
        this.initializeGame();
        this.setupEventListeners();
        this.detectMobile();
    }

    initializeGame() {
        this.gameState.updateUI();
        this.showScreen('startScreen');
    }

    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
        
        if (isMobile) {
            document.getElementById('mobileControls').style.display = 'block';
        }
    }

    setupEventListeners() {
        // Controles de teclado
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Botões da interface
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('menuBtn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('pauseMenuBtn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('mobilePause').addEventListener('click', () => this.togglePause());
        
        // Seletor de dificuldade
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDifficulty(e));
        });
        
        // Controles móveis
        document.querySelectorAll('.control-btn[data-direction]').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDirectionInput(btn.dataset.direction);
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDirectionInput(btn.dataset.direction);
            });
        });
        
        // Prevenir zoom no mobile
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    handleKeyPress(e) {
        if (!this.gameState.isGameRunning) return;
        
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
                e.preventDefault();
                this.handleDirectionInput('up');
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                this.handleDirectionInput('down');
                break;
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                this.handleDirectionInput('left');
                break;
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                this.handleDirectionInput('right');
                break;
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
            case 'KeyR':
                e.preventDefault();
                this.restartGame();
                break;
        }
    }

    handleDirectionInput(direction) {
        if (this.gameState.isPaused || !this.gameState.isGameRunning) return;
        
        const directions = {
            'up': { x: 0, y: -GAME_CONFIG.GRID_SIZE },
            'down': { x: 0, y: GAME_CONFIG.GRID_SIZE },
            'left': { x: -GAME_CONFIG.GRID_SIZE, y: 0 },
            'right': { x: GAME_CONFIG.GRID_SIZE, y: 0 }
        };
        
        const newDirection = directions[direction];
        
        // Prevenir movimento na direção oposta
        if (newDirection.x === -this.gameState.direction.x && newDirection.y === -this.gameState.direction.y) {
            return;
        }
        
        this.gameState.direction = newDirection;
    }

    selectDifficulty(e) {
        document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.gameState.gameSpeed = parseInt(e.target.dataset.speed);
    }

    startGame() {
        this.gameState.reset();
        this.gameState.isGameRunning = true;
        this.gameState.direction = { x: GAME_CONFIG.GRID_SIZE, y: 0 }; // Começar movendo para a direita
        this.hideAllScreens();
        this.startGameLoop();
    }

    restartGame() {
        this.stopGameLoop();
        this.startGame();
    }

    showMainMenu() {
        this.stopGameLoop();
        this.gameState.reset();
        this.showScreen('startScreen');
    }

    togglePause() {
        if (!this.gameState.isGameRunning) return;
        
        this.gameState.isPaused = !this.gameState.isPaused;
        
        if (this.gameState.isPaused) {
            this.showScreen('pauseScreen');
        } else {
            this.hideAllScreens();
        }
    }

    resumeGame() {
        this.gameState.isPaused = false;
        this.hideAllScreens();
    }

    showScreen(screenId) {
        this.hideAllScreens();
        document.getElementById(screenId).style.display = 'flex';
    }

    hideAllScreens() {
        const screens = ['startScreen', 'gameOverScreen', 'pauseScreen'];
        screens.forEach(screenId => {
            document.getElementById(screenId).style.display = 'none';
        });
    }

    startGameLoop() {
        this.lastRenderTime = 0;
        this.gameLoop = requestAnimationFrame((timestamp) => this.gameLoopCallback(timestamp));
    }

    stopGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
    }

    gameLoopCallback(timestamp) {
        if (timestamp - this.lastRenderTime >= this.gameState.gameSpeed) {
            if (!this.gameState.isPaused) {
                this.update();
            }
            this.render();
            this.lastRenderTime = timestamp;
        }
        
        if (this.gameState.isGameRunning) {
            this.gameLoop = requestAnimationFrame((timestamp) => this.gameLoopCallback(timestamp));
        }
    }

    update() {
        // Mover a cobra
        const head = { ...this.gameState.snake[0] };
        head.x += this.gameState.direction.x;
        head.y += this.gameState.direction.y;
        
        // Verificar colisão com paredes
        if (head.x < 0 || head.x >= GAME_CONFIG.CANVAS_SIZE || 
            head.y < 0 || head.y >= GAME_CONFIG.CANVAS_SIZE) {
            this.gameOver();
            return;
        }
        
        // Verificar colisão com o próprio corpo
        if (this.gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }
        
        this.gameState.snake.unshift(head);
        
        // Verificar se comeu a comida
        if (head.x === this.gameState.food.x && head.y === this.gameState.food.y) {
            this.gameState.updateScore(GAME_CONFIG.POINTS_PER_FOOD);
            this.gameState.food = this.gameState.generateFood();
            this.gameState.playSound('eat');
            
            // Efeito visual de comer
            this.canvas.classList.add('flash');
            setTimeout(() => this.canvas.classList.remove('flash'), 100);
        } else {
            this.gameState.snake.pop();
        }
    }

    render() {
        // Limpar canvas
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_SIZE, GAME_CONFIG.CANVAS_SIZE);
        
        // Desenhar grade (opcional)
        this.drawGrid();
        
        // Desenhar comida
        this.drawFood();
        
        // Desenhar cobra
        this.drawSnake();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= GAME_CONFIG.CANVAS_SIZE; i += GAME_CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, GAME_CONFIG.CANVAS_SIZE);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(GAME_CONFIG.CANVAS_SIZE, i);
            this.ctx.stroke();
        }
    }

    drawFood() {
        const gradient = this.ctx.createRadialGradient(
            this.gameState.food.x + GAME_CONFIG.GRID_SIZE / 2,
            this.gameState.food.y + GAME_CONFIG.GRID_SIZE / 2,
            0,
            this.gameState.food.x + GAME_CONFIG.GRID_SIZE / 2,
            this.gameState.food.y + GAME_CONFIG.GRID_SIZE / 2,
            GAME_CONFIG.GRID_SIZE / 2
        );
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ee5a52');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.gameState.food.x + 2,
            this.gameState.food.y + 2,
            GAME_CONFIG.GRID_SIZE - 4,
            GAME_CONFIG.GRID_SIZE - 4
        );
        
        // Efeito de brilho
        this.ctx.shadowColor = '#ff6b6b';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(
            this.gameState.food.x + 2,
            this.gameState.food.y + 2,
            GAME_CONFIG.GRID_SIZE - 4,
            GAME_CONFIG.GRID_SIZE - 4
        );
        this.ctx.shadowBlur = 0;
    }

    drawSnake() {
        this.gameState.snake.forEach((segment, index) => {
            if (index === 0) {
                // Cabeça da cobra
                const gradient = this.ctx.createRadialGradient(
                    segment.x + GAME_CONFIG.GRID_SIZE / 2,
                    segment.y + GAME_CONFIG.GRID_SIZE / 2,
                    0,
                    segment.x + GAME_CONFIG.GRID_SIZE / 2,
                    segment.y + GAME_CONFIG.GRID_SIZE / 2,
                    GAME_CONFIG.GRID_SIZE / 2
                );
                gradient.addColorStop(0, '#4CAF50');
                gradient.addColorStop(1, '#45a049');
                this.ctx.fillStyle = gradient;
                
                // Efeito de brilho na cabeça
                this.ctx.shadowColor = '#4CAF50';
                this.ctx.shadowBlur = 5;
            } else {
                // Corpo da cobra
                const alpha = Math.max(0.6, 1 - (index * 0.05));
                this.ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.fillRect(
                segment.x + 1,
                segment.y + 1,
                GAME_CONFIG.GRID_SIZE - 2,
                GAME_CONFIG.GRID_SIZE - 2
            );
        });
        
        this.ctx.shadowBlur = 0;
    }

    gameOver() {
        this.gameState.isGameRunning = false;
        this.gameState.playSound('gameover');
        
        // Efeito visual de game over
        this.canvas.classList.add('shake');
        setTimeout(() => this.canvas.classList.remove('shake'), 500);
        
        const isNewRecord = this.gameState.updateHighScore();
        
        document.getElementById('finalScore').textContent = `Sua pontuação: ${this.gameState.score}`;
        
        if (isNewRecord) {
            document.getElementById('newRecord').style.display = 'block';
        } else {
            document.getElementById('newRecord').style.display = 'none';
        }
        
        this.gameState.updateUI();
        
        setTimeout(() => {
            this.showScreen('gameOverScreen');
        }, 500);
    }
}

// Inicializar o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});

// Prevenir zoom no mobile
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
});

document.addEventListener('gestureend', (e) => {
    e.preventDefault();
});