class Dictionary {
    constructor() {
        this.words = [];
    }

    async load(level) {
        try {
            const response = await fetch(`assets/level${level}.txt`);
            const text = await response.text();
            this.words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
            return true;
        } catch (err) {
            console.error('Failed to load words', err);
            this.words = [];
            return false;
        }
    }

    pickWord() {
        if (this.words.length === 0) return null;
        return this.words[Math.floor(Math.random() * this.words.length)];
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
        this.levelButtons = document.querySelectorAll('.level-select .btn');
        this.restartBtn = document.getElementById('restart-btn');
    }

    bindStartGame(handler) {
        this.levelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                handler(level);
            });
        });
    }

    bindRestart(handler) {
        this.restartBtn.addEventListener('click', handler);
    }

    bindInput(handler) {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handler(this.input.value);
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
    constructor() {
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

        let currentInterval = state.baseSpawnInterval;
        if (state.isRush) currentInterval = 500;

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

        const timeElapsed = state.duration - state.timeLeft;
        const isRushMoment = (timeElapsed > 30 && timeElapsed < 35) ||
            (timeElapsed > 60 && timeElapsed < 65) ||
            (timeElapsed > 90 && timeElapsed < 95);
        state.isRush = isRushMoment;
    }

    // Decision: Returns match index or -1
    checkInput(state, text) {
        return state.wordManager.findIndexByText(text);
    }

    // Decision: Update positions and check Game Over condition
    updatePhysics(state, dt, containerHeight) {
        const fallSpeed = 1 + (state.level * 0.5);
        const speed = fallSpeed * (dt / 16);

        return state.wordManager.updatePositions(speed, containerHeight);
    }

    getRandomXPosition() {
        return Math.random() * 80 + 5;
    }

    getScoreForWord(word) {
        return word.length * 10;
    }
}

class GameState {
    constructor(duration = 120) {
        this.score = 0;
        this.level = 1;
        this.duration = duration;
        this.timeLeft = duration;
        this.isPlaying = false;
        this.wordManager = new ActiveWordManager();
        this.spawnTimer = 0;
        this.baseSpawnInterval = 2000;
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
        this.dictionary = new Dictionary();
        this.ui = new UIController();
        this.state = new GameState();
        this.logic = new GameLogic();

        this.init();
    }

    init() {
        this.ui.bindStartGame((level) => {
            this.state.level = level;
            this.startGame();
        });

        this.ui.bindRestart(() => {
            this.ui.showStartScreen();
        });

        this.ui.bindInput((text) => {
            this.checkInput(text);
        });

        // Game Logic Bindings
        this.logic.setWordPicker(() => this.dictionary.pickWord());

        this.logic.on('spawn', (word) => {
            this.spawnWord(word);
        });

        this.logic.on('gameOver', () => {
            this.endGame(false);
        });
    }

    async startGame() {
        await this.dictionary.load(this.state.level);

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
            this.removeWord(matchIndex);

            const points = this.logic.getScoreForWord(hitWord.word);
            this.state.addScore(points);

            this.ui.updateHUD(this.state.level, this.state.score, this.state.timeLeft);
            this.ui.clearInput();
        } else {
            this.ui.shakeInput();
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

// Start
window.addEventListener('DOMContentLoaded', () => {
    new TypingGame();
});
