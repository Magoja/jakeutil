class GameConfig {
    constructor() {
        this.gameDuration = 120; // seconds

        // Spawning
        this.baseSpawnInterval = 2000; // ms
        this.rushSpawnInterval = 500; // ms

        // Difficulty / Speed
        this.baseFallSpeed = 0.2;
        this.levelSpeedMultiplier = 0.1;

        // Scoring
        this.pointsPerCharacter = 10;

        // Rush Mode: triggers at these elapsed seconds
        this.rushTimes = [30, 60, 90];
        this.rushDuration = 5; // seconds

        // Level Definitions
        // dictionary distributions: 0 (chars) to 5 (words_5)
        this.levels = {
            1: { dist: [1.0, 0, 0, 0, 0, 0], desc: "Single Characters" },
            2: { dist: [0.5, 0.5, 0, 0, 0, 0], desc: "Mix Chars / Very Easy" },
            3: { dist: [0.2, 0.8, 0, 0, 0, 0], desc: "Mostly Very Easy" },
            4: { dist: [0, 1.0, 0, 0, 0, 0], desc: "All Very Easy" },
            5: { dist: [0, 0.5, 0.5, 0, 0, 0], desc: "Mix Very Easy / Easy" },
            6: { dist: [0, 0.2, 0.5, 0.3, 0, 0], desc: "Mix Easy / Medium" },
            7: { dist: [0, 0, 0.4, 0.6, 0, 0], desc: "Mostly Medium" },
            8: { dist: [0, 0, 0.2, 0.5, 0.3, 0], desc: "Intro Hard" },
            9: { dist: [0, 0, 0, 0.5, 0.5, 0], desc: "Mix Hard" },
            10: { dist: [0, 0, 0, 0.2, 0.4, 0.4], desc: "Mostly Very Hard" }
        };
    }
}

class Dictionary {
    constructor(url) {
        this.url = url;
        this.words = [];
    }

    async load() {
        try {
            const response = await fetch(this.url);
            const text = await response.text();
            this.words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
            return true;
        } catch (err) {
            console.error(`Failed to load ${this.url}`, err);
            this.words = [];
            return false;
        }
    }

    getRandomWord() {
        if (this.words.length === 0) return null;
        return this.words[Math.floor(Math.random() * this.words.length)];
    }
}

class GameDictionary {
    constructor(config) {
        this.config = config;
        // Create 6 dictionaries for 6 complexity levels (0 to 5)
        this.dictionaries = [
            new Dictionary('assets/words_0.txt'),
            new Dictionary('assets/words_1.txt'),
            new Dictionary('assets/words_2.txt'),
            new Dictionary('assets/words_3.txt'),
            new Dictionary('assets/words_4.txt'),
            new Dictionary('assets/words_5.txt')
        ];

        // Start loading immediately
        this.loadAll();
    }

    async loadAll() {
        await Promise.all(this.dictionaries.map(d => d.load()));
    }

    pickWord(level) {
        const levelConfig = this.config.levels[level];
        // Fallback to first dict if config missing
        if (!levelConfig) return this.dictionaries[0].getRandomWord();

        const rand = Math.random();
        let cumulative = 0;

        // Distribution logic
        for (let i = 0; i < levelConfig.dist.length; i++) {
            cumulative += levelConfig.dist[i];
            if (rand <= cumulative) {
                // Try to pick from this dictionary
                const dict = this.dictionaries[i];
                const word = dict.getRandomWord();
                if (word) return word;
            }
        }

        // Fallback (e.g. if random roll edge case or empty dict)
        return this.dictionaries[0].getRandomWord();
    }
}

class UIController {
    constructor() {
        // DOM Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.gameArea = document.getElementById('game-area');
        this.input = document.getElementById('word-input');

        this.scoreDisplay = document.getElementById('score-display');
        this.timeDisplay = document.getElementById('time-display');
        this.levelDisplay = document.getElementById('level-display');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.gameOverReasonDisplay = document.getElementById('game-over-reason');
        this.rushIndicator = document.getElementById('rush-indicator');
        this.levelButtonsContainer = document.querySelector('.level-select .level-select');
        this.restartBtn = document.getElementById('restart-btn');

        this.levelButtons = [];
    }

    createLevelButtons(levelsConfig, handler) {
        this.levelButtonsContainer.innerHTML = '';
        this.levelButtons = [];

        for (const [level, config] of Object.entries(levelsConfig)) {
            const btn = document.createElement('button');
            btn.classList.add('btn');
            btn.dataset.level = level;
            btn.dataset.tooltip = config.desc;
            btn.innerText = level;

            btn.addEventListener('click', () => {
                handler(parseInt(level));
            });

            this.levelButtonsContainer.appendChild(btn);
            this.levelButtons.push(btn);
        }
    }

    bindRestart(handler) {
        this.restartBtn.addEventListener('click', handler);
    }

    bindInput(handler) {
        this.input.addEventListener('input', (e) => {
            handler(this.input.value);
        });
    }

    bindEnter(handler) {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handler();
            }
        });
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
    }

    showGameScreen() {
        this.startScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.rushIndicator.classList.add('hidden');
        this.input.focus();
    }

    showGameOverScreen(score, isWin) {
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.remove('hidden');

        this.finalScoreDisplay.innerText = score;

        if (isWin) {
            this.gameOverReasonDisplay.innerText = "Time's Up! Well Done!";
            this.gameOverReasonDisplay.style.color = "#00ffcc";
        } else {
            this.gameOverReasonDisplay.innerText = "Game Over! A word hit the bottom.";
            this.gameOverReasonDisplay.style.color = "#ff0055";
        }
    }

    updateHUD(level, score, timeLeft) {
        this.levelDisplay.innerText = level;
        this.scoreDisplay.innerText = score;

        const m = Math.floor(timeLeft / 60);
        const s = Math.floor(timeLeft % 60);
        this.timeDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    clearGameArea() {
        this.gameArea.innerHTML = '';
    }

    clearInput() {
        this.input.value = '';
    }

    shakeInput() {
        this.input.classList.add('error');
        setTimeout(() => this.input.classList.remove('error'), 200);
    }

    toggleRushIndicator(show) {
        if (show) this.rushIndicator.classList.remove('hidden');
        else this.rushIndicator.classList.add('hidden');
    }

    createWordElement(text, x) {
        const el = document.createElement('div');
        el.classList.add('word-entity');
        el.innerText = text;
        el.style.left = `${x}%`;
        el.style.top = '-50px';
        this.gameArea.appendChild(el);
        return el;
    }

    updateWordPosition(el, y) {
        el.style.top = `${y}px`;
    }

    removeWordElement(el) {
        el.remove();
    }

    getGameAreaHeight() {
        return this.gameArea.clientHeight;
    }
    getGameAreaHeight() {
        return this.gameArea.clientHeight;
    }
}

class ActiveWordManager {
    constructor() {
        this.words = [];
    }

    add(wordObj) {
        this.words.push(wordObj);
    }

    remove(index) {
        if (index > -1 && index < this.words.length) {
            this.words.splice(index, 1);
        }
    }

    get(index) {
        return this.words[index];
    }

    getAll() {
        return this.words;
    }

    clear() {
        this.words = [];
    }

    findIndexByText(text) {
        text = text.trim().toLowerCase();
        return this.words.findIndex(w => w.word.toLowerCase() === text);
    }

    updatePositions(speed, containerHeight) {
        let isGameOver = false;
        for (const w of this.words) {
            w.y += speed;
            if (w.y > containerHeight - 30) {
                isGameOver = true;
            }
        }
        return isGameOver;
    }
}

class GameLogic {
    constructor(config) {
        this.config = config;
        this.events = {};
        this.wordPicker = null;
    }

    on(event, callback) {
        this.events[event] = callback;
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event](...args);
        }
    }

    setWordPicker(pickerFn) {
        this.wordPicker = pickerFn;
    }

    // Decision: Main update loop
    update(state, dt, containerHeight) {
        this.updateTime(state, dt / 1000);

        if (this.shouldSpawn(state, dt)) {
            if (this.wordPicker) {
                const word = this.wordPicker();
                if (word) {
                    this.emit('spawn', word);
                }
            }
        }

        const gameOver = this.updatePhysics(state, dt, containerHeight);
        if (gameOver) {
            this.emit('gameOver');
        }
    }

    // Decision: Is it time spawn?
    shouldSpawn(state, dt) {
        state.spawnTimer += dt;

        let currentInterval = this.config.baseSpawnInterval;
        if (state.isRush) currentInterval = this.config.rushSpawnInterval;

        // Difficulty Logic
        currentInterval = currentInterval / (state.level * 0.8);

        if (state.spawnTimer > currentInterval) {
            state.spawnTimer = 0;
            return true;
        }
        return false;
    }

    // Decision: Update time and check rush state
    updateTime(state, dt) {
        state.timeLeft -= dt;

        const timeElapsed = this.config.gameDuration - state.timeLeft;

        let isRushMoment = false;
        for (const t of this.config.rushTimes) {
            if (timeElapsed > t && timeElapsed < t + this.config.rushDuration) {
                isRushMoment = true;
                break;
            }
        }
        state.isRush = isRushMoment;
    }

    // Decision: Returns match index or -1
    checkInput(state, text) {
        return state.wordManager.findIndexByText(text);
    }

    // Decision: Update positions and check Game Over condition
    updatePhysics(state, dt, containerHeight) {
        const fallSpeed = this.config.baseFallSpeed + (state.level * this.config.levelSpeedMultiplier);
        const speed = fallSpeed * (dt / 16);

        return state.wordManager.updatePositions(speed, containerHeight);
    }

    getRandomXPosition() {
        return Math.random() * 80 + 5;
    }

    getScoreForWord(word) {
        return word.length * this.config.pointsPerCharacter;
    }
}

class GameState {
    constructor(duration) {
        this.score = 0;
        this.level = 1;
        this.duration = duration;
        this.timeLeft = duration;
        this.isPlaying = false;
        this.wordManager = new ActiveWordManager();
        this.spawnTimer = 0;
        this.isRush = false;
    }

    reset(level) {
        this.score = 0;
        this.level = level;
        this.timeLeft = this.duration;
        this.isPlaying = true;
        this.wordManager.clear();
        this.spawnTimer = 0;
        this.isRush = false;
    }

    addScore(points) {
        this.score += points;
    }

    tick(dt) {
        this.timeLeft -= dt;
    }

    isTimeUp() {
        return this.timeLeft <= 0;
    }
}

class TypingGame {
    constructor() {
        this.config = new GameConfig();
        this.gameDictionary = new GameDictionary(this.config);
        this.ui = new UIController();
        this.state = new GameState(this.config.gameDuration);
        this.logic = new GameLogic(this.config);
        this.particles = new ParticleSystem(this.ui.gameArea);

        this.init();
    }

    init() {
        this.ui.createLevelButtons(this.config.levels, (level) => {
            this.state.level = level;
            this.startGame();
        });

        this.ui.bindRestart(() => {
            this.ui.showStartScreen();
        });

        this.ui.bindInput((text) => {
            this.checkInput(text);
        });

        this.ui.bindEnter(() => {
            this.ui.clearInput();
        });

        // Game Logic Bindings
        this.logic.setWordPicker(() => this.gameDictionary.pickWord(this.state.level));

        this.logic.on('spawn', (word) => {
            this.spawnWord(word);
        });

        this.logic.on('gameOver', () => {
            this.endGame(false);
        });
    }

    async startGame() {
        this.state.reset(this.state.level);
        this.ui.clearGameArea();
        this.ui.clearInput();

        this.ui.showGameScreen();
        this.ui.updateHUD(this.state.level, this.state.score, this.state.timeLeft);

        this.lastTime = performance.now();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    gameLoop(time) {
        if (!this.state.isPlaying) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.logic.update(this.state, deltaTime, this.ui.getGameAreaHeight());
        this.particles.update();

        // 4. Update UI
        this.ui.updateHUD(this.state.level, this.state.score, this.state.timeLeft);
        this.ui.toggleRushIndicator(this.state.isRush);
        this.state.wordManager.getAll().forEach(w => this.ui.updateWordPosition(w.el, w.y));

        // 5. Check End Conditions
        if (this.state.isTimeUp()) {
            this.endGame(true);
        } else {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    spawnWord(wordText) {
        if (!wordText) return;

        const randomLeft = this.logic.getRandomXPosition();
        const el = this.ui.createWordElement(wordText, randomLeft);

        this.state.wordManager.add({
            id: Date.now() + Math.random(),
            word: wordText,
            x: randomLeft,
            y: -50,
            el: el
        });
    }

    checkInput(text) {
        const matchIndex = this.logic.checkInput(this.state, text);

        if (matchIndex !== -1) {
            const hitWord = this.state.wordManager.get(matchIndex);

            // Calculate spawn position BEFORE removing the element
            const spawnX = hitWord.el.offsetLeft + (hitWord.el.offsetWidth / 2);
            const spawnY = hitWord.el.offsetTop + (hitWord.el.offsetHeight / 2);

            this.removeWord(matchIndex);

            const points = this.logic.getScoreForWord(hitWord.word);
            this.state.addScore(points);

            // Spawn particles at word location
            this.particles.spawn(spawnX, spawnY);

            this.ui.updateHUD(this.state.level, this.state.score, this.state.timeLeft);
            this.ui.clearInput();
        }
    }

    removeWord(index) {
        const w = this.state.wordManager.get(index);
        this.ui.removeWordElement(w.el);
        this.state.wordManager.remove(index);
    }

    endGame(isWin) {
        this.state.isPlaying = false;
        this.ui.showGameOverScreen(this.state.score, isWin);
    }
}

class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.particles = [];
    }

    spawn(x, y, count = 10, color = '#00ffcc') {
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.classList.add('particle');

            // Random spread
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // Random size
            const size = Math.random() * 5 + 3;

            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.backgroundColor = color;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            this.container.appendChild(el);

            this.particles.push({
                el,
                x, y,
                vx, vy,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= p.decay;

            p.el.style.left = `${p.x}px`;
            p.el.style.top = `${p.y}px`;
            p.el.style.opacity = p.life;

            if (p.life <= 0) {
                p.el.remove();
                this.particles.splice(i, 1);
            }
        }
    }

    clear() {
        this.particles.forEach(p => p.el.remove());
        this.particles = [];
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    new TypingGame();
});
