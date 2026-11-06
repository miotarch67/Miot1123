const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const startScreen = document.getElementById('startScreen');
const screenTitle = document.getElementById('screenTitle');
const screenMessage = document.getElementById('screenMessage');
const startButton = document.getElementById('startButton');
const soundButton = document.getElementById('soundButton');

const ROAD = { left: 60, width: 300, laneCount: 3, laneWidth: 100 };
const player = { width: 44, height: 82, x: 0, y: 0, speed: 330, color: '#38bdf8' };
const game = {
  lastTime: 0,
  state: 'ready',
  score: 0,
  best: Number(localStorage.getItem('carGameBest') || 0),
  spawnTimer: 0,
  soundOn: true,
  audio: null,
};

const enemyCars = [];
const keys = { left: false, right: false };

function resetPlayer() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 32;
}

function updateBest() {
  bestEl.textContent = Math.floor(game.best);
}

function setScreen(title, message, buttonText) {
  screenTitle.textContent = title;
  screenMessage.textContent = message;
  startButton.textContent = buttonText;
  startScreen.hidden = false;
}

function startGame() {
  if (game.state === 'playing') return;
  if (game.audio && game.audio.state === 'suspended') game.audio.resume();
  game.state = 'playing';
  game.score = 0;
  game.spawnTimer = 0.8;
  enemyCars.length = 0;
  keys.left = false;
  keys.right = false;
  resetPlayer();
  scoreEl.textContent = '0';
  startScreen.hidden = true;
  playTone(520, 0.09, 'sine', 0.05);
}

function addEnemy() {
  const lane = Math.floor(Math.random() * ROAD.laneCount);
  const x = ROAD.left + lane * ROAD.laneWidth + (ROAD.laneWidth - 44) / 2;
  enemyCars.push({
    x,
    y: -100,
    width: 44,
    height: 84,
    speed: 220 + Math.random() * 120 + game.score * 0.06,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
  });
}

function rectIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

function gameOver() {
  game.state = 'over';
  keys.left = false;
  keys.right = false;
  game.best = Math.max(game.best, Math.floor(game.score));
  localStorage.setItem('carGameBest', String(game.best));
  updateBest();
  playTone(150, 0.35, 'sawtooth', 0.08);
  setScreen('Crash!', `Score: ${Math.floor(game.score)} · Best: ${Math.floor(game.best)}`, 'Play again');
}

function update(dt) {
  if (game.state !== 'playing') return;

  game.score += dt * 18;
  scoreEl.textContent = Math.floor(game.score);

  const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  player.x += direction * player.speed * dt;
  const roadRight = ROAD.left + ROAD.width;
  player.x = Math.max(ROAD.left + 10, Math.min(roadRight - player.width - 10, player.x));

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    addEnemy();
    game.spawnTimer = Math.max(0.55, 1.15 - game.score / 1000);
  }

  for (let i = enemyCars.length - 1; i >= 0; i--) {
    const enemy = enemyCars[i];
    enemy.y += enemy.speed * dt;
    if (rectIntersect(player, enemy)) {
      gameOver();
      return;
    }
    if (enemy.y > canvas.height + 100) enemyCars.splice(i, 1);
  }
}

function drawRoad() {
  ctx.fillStyle = '#374151';
  ctx.fillRect(ROAD.left, 0, ROAD.width, canvas.height);
  ctx.fillStyle = '#f8fafc';
  for (let i = 0; i < 18; i++) {
    const y = (i * 48 + (game.score * 2) % 48) - 48;
    ctx.fillRect(ROAD.left + ROAD.laneWidth - 6, y, 12, 32);
    ctx.fillRect(ROAD.left + ROAD.laneWidth * 2 - 6, y, 12, 32);
  }
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(ROAD.left, 0, ROAD.width, canvas.height);
}

function drawCar(car, isPlayer = false) {
  const { x, y, width: w, height: h } = car;
  ctx.fillStyle = isPlayer ? player.color : car.color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 4, y + 6, w - 8, h * 0.22);
  ctx.fillRect(x + 4, y + h - 18, w - 8, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x + 2, y + 12, 7, 18);
  ctx.fillRect(x + w - 9, y + 12, 7, 18);
  ctx.fillRect(x + 2, y + h - 30, 7, 18);
  ctx.fillRect(x + w - 9, y + h - 30, 7, 18);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  drawCar(player, true);
  enemyCars.forEach((enemy) => drawCar(enemy));
}

function ensureAudio() {
  if (!game.audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) game.audio = new AudioContext();
  }
  if (game.audio && game.audio.state === 'suspended') game.audio.resume();
}

function playTone(frequency, duration, type = 'sine', volume = 0.06) {
  if (!game.soundOn || !game.audio) return;
  const oscillator = game.audio.createOscillator();
  const gain = game.audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, game.audio.currentTime);
  gain.gain.setValueAtTime(volume, game.audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, game.audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(game.audio.destination);
  oscillator.start();
  oscillator.stop(game.audio.currentTime + duration);
}

function setSteering(direction, pressed) {
  if (game.state !== 'playing') return;
  keys[direction] = pressed;
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft' || key === 'a') {
    keys.left = true;
    event.preventDefault();
  }
  if (event.key === 'ArrowRight' || key === 'd') {
    keys.right = true;
    event.preventDefault();
  }
  if (game.state !== 'playing' && (event.code === 'Space' || event.key === 'Enter')) {
    event.preventDefault();
    ensureAudio();
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft' || key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || key === 'd') keys.right = false;
});

window.addEventListener('blur', () => {
  keys.left = false;
  keys.right = false;
});

document.querySelectorAll('.steer-button').forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setSteering(direction, true);
  });
  const release = () => setSteering(direction, false);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

startButton.addEventListener('click', () => {
  ensureAudio();
  startGame();
});

soundButton.addEventListener('click', () => {
  ensureAudio();
  game.soundOn = !game.soundOn;
  soundButton.textContent = game.soundOn ? '🔊 Sound on' : '🔇 Sound off';
  soundButton.setAttribute('aria-pressed', String(game.soundOn));
  if (game.soundOn) playTone(660, 0.1);
});

function gameLoop(timestamp) {
  const dt = game.lastTime ? Math.min((timestamp - game.lastTime) / 1000, 0.05) : 0.016;
  game.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

resetPlayer();
updateBest();
setScreen('Ready to race?', 'Dodge the traffic and get the highest score!', 'Start game');
requestAnimationFrame(gameLoop);
