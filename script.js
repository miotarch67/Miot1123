const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const ROAD = {
  left: 60,
  width: 300,
  laneCount: 3,
  laneWidth: 100,
};

const player = {
  width: 44,
  height: 82,
  x: 0,
  y: 0,
  speed: 330,
  color: '#38bdf8',
};

const game = {
  lastTime: 0,
  running: true,
  score: 0,
  best: Number(localStorage.getItem('carGameBest') || 0),
  spawnTimer: 0,
};

const enemyCars = [];
const keys = {
  left: false,
  right: false,
};

function resetPlayer() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 32;
}

function updateBest() {
  bestEl.textContent = Math.floor(game.best);
}

function resetGame() {
  game.running = true;
  game.score = 0;
  game.spawnTimer = 0.9;
  enemyCars.length = 0;
  resetPlayer();
  scoreEl.textContent = '0';
}

function addEnemy() {
  const lane = Math.floor(Math.random() * ROAD.laneCount);
  const x = ROAD.left + lane * ROAD.laneWidth + (ROAD.laneWidth - 44) / 2;
  const car = {
    x,
    y: -100,
    width: 44,
    height: 84,
    speed: 220 + Math.random() * 120 + game.score * 0.06,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
  };
  enemyCars.push(car);
}

function rectIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(dt) {
  if (!game.running) {
    return;
  }

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
      game.running = false;
      game.best = Math.max(game.best, Math.floor(game.score));
      localStorage.setItem('carGameBest', String(game.best));
      updateBest();
      return;
    }

    if (enemy.y > canvas.height + 100) {
      enemyCars.splice(i, 1);
    }
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
  const x = car.x;
  const y = car.y;
  const w = car.width;
  const h = car.height;

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

function drawGameOver() {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px Arial';
  ctx.fillText('Crash!', canvas.width / 2, canvas.height / 2 - 18);

  ctx.font = '24px Arial';
  ctx.fillText(`Score: ${Math.floor(game.score)}`, canvas.width / 2, canvas.height / 2 + 26);
  ctx.fillText('Press Space to retry', canvas.width / 2, canvas.height / 2 + 70);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  drawCar(player, true);
  enemyCars.forEach((enemy) => drawCar(enemy));

  if (!game.running) {
    drawGameOver();
  }
}

function gameLoop(timestamp) {
  const dt = (timestamp - game.lastTime) / 1000 || 0.016;
  game.lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (event.key === 'ArrowLeft' || key === 'a') {
    keys.left = true;
  }
  if (event.key === 'ArrowRight' || key === 'd') {
    keys.right = true;
  }

  if (!game.running && (event.code === 'Space' || event.key === 'Enter')) {
    event.preventDefault();
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();

  if (event.key === 'ArrowLeft' || key === 'a') {
    keys.left = false;
  }
  if (event.key === 'ArrowRight' || key === 'd') {
    keys.right = false;
  }
});

resetPlayer();
updateBest();
requestAnimationFrame(gameLoop);
