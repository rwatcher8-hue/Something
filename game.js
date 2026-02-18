const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const recipesDoneEl = document.getElementById('recipesDone');
const recipeListEl = document.getElementById('recipeList');
const overlay = document.getElementById('overlay');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const ingredientTypes = [
  { name: 'Bat Basil', color: '#77f2aa' },
  { name: 'Moon Salt', color: '#f3f7ff' },
  { name: 'Night Pepper', color: '#7f7f9f' },
  { name: 'Phantom Onion', color: '#cf9fff' },
  { name: 'Cinder Garlic', color: '#ffb872' },
  { name: 'Wraith Tomato', color: '#ff6978' },
  { name: 'Fog Mushroom', color: '#aed7ff' }
];

const obstacles = [
  { x: 120, y: 95, w: 190, h: 80, name: 'Counter 1' },
  { x: 420, y: 75, w: 220, h: 110, name: 'Stove' },
  { x: 730, y: 120, w: 130, h: 250, name: 'Pantry' },
  { x: 130, y: 310, w: 240, h: 140, name: 'Prep Table' },
  { x: 435, y: 290, w: 190, h: 190, name: 'Sink' }
];

const utensils = [
  { x: 70, y: 80, length: 38, angle: 0 },
  { x: 680, y: 530, length: 42, angle: 0.3 },
  { x: 880, y: 70, length: 36, angle: -0.2 }
];

const game = {
  timeLeft: 75,
  score: 0,
  recipesDone: 0,
  running: true,
  lastFrame: performance.now(),
  timerAccumulator: 0
};

const player = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  speed: 220,
  radius: 18,
  bobPhase: 0
};

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

const ingredients = [];
const poltergeists = [];
const recipe = [];
let recipeIndex = 0;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function pointInObstacle(x, y, pad = 0) {
  return obstacles.some((o) =>
    x > o.x - pad &&
    x < o.x + o.w + pad &&
    y > o.y - pad &&
    y < o.y + o.h + pad
  );
}

function getValidSpawn(radius = 18) {
  for (let i = 0; i < 60; i += 1) {
    const x = randomBetween(40, WIDTH - 40);
    const y = randomBetween(40, HEIGHT - 40);
    if (!pointInObstacle(x, y, radius + 6)) {
      return { x, y };
    }
  }
  return { x: randomBetween(30, WIDTH - 30), y: randomBetween(30, HEIGHT - 30) };
}

function setNewRecipe() {
  recipe.length = 0;
  recipeIndex = 0;
  const needed = Math.floor(randomBetween(3, 6));
  const bag = [...ingredientTypes].sort(() => Math.random() - 0.5);
  for (let i = 0; i < needed; i += 1) {
    recipe.push(bag[i]);
  }
  renderRecipe();
}

function renderRecipe() {
  recipeListEl.innerHTML = '';
  recipe.forEach((item, idx) => {
    const li = document.createElement('li');
    li.textContent = item.name;
    if (idx < recipeIndex) {
      li.classList.add('done');
    }
    recipeListEl.appendChild(li);
  });
}

function spawnIngredient() {
  if (ingredients.length > 9) return;
  const type = ingredientTypes[Math.floor(Math.random() * ingredientTypes.length)];
  const p = getValidSpawn(14);
  ingredients.push({
    x: p.x,
    y: p.y,
    type,
    radius: 12,
    hoverSeed: Math.random() * 6.28
  });
}

function spawnPoltergeists(count = 4) {
  for (let i = 0; i < count; i += 1) {
    const p = getValidSpawn(20);
    poltergeists.push({
      x: p.x,
      y: p.y,
      vx: randomBetween(-70, 70),
      vy: randomBetween(-70, 70),
      radius: 17,
      modeTimer: randomBetween(1.8, 3.8),
      chase: false,
      wobble: Math.random() * 7
    });
  }
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;
  if (keys.ArrowUp) my -= 1;
  if (keys.ArrowDown) my += 1;
  if (keys.ArrowLeft) mx -= 1;
  if (keys.ArrowRight) mx += 1;

  if (mx !== 0 || my !== 0) {
    const mag = Math.hypot(mx, my) || 1;
    player.x += (mx / mag) * player.speed * dt;
    player.y += (my / mag) * player.speed * dt;
  }

  player.x = Math.max(12, Math.min(WIDTH - 12, player.x));
  player.y = Math.max(12, Math.min(HEIGHT - 12, player.y));
  player.bobPhase += dt * 4;
}

function updateIngredients(time) {
  for (let i = ingredients.length - 1; i >= 0; i -= 1) {
    const ing = ingredients[i];
    if (circleHit(player, ing)) {
      const expected = recipe[recipeIndex];
      if (expected && ing.type.name === expected.name) {
        game.score += 30;
        recipeIndex += 1;
        renderRecipe();
        if (recipeIndex >= recipe.length) {
          game.recipesDone += 1;
          game.score += 120;
          recipesDoneEl.textContent = String(game.recipesDone);
          setNewRecipe();
        }
      } else {
        game.score = Math.max(0, game.score - 5);
      }
      ingredients.splice(i, 1);
      scoreEl.textContent = String(game.score);
      spawnIngredient();
    } else {
      ing.y += Math.sin(time * 0.003 + ing.hoverSeed) * 0.2;
    }
  }
}

function updatePoltergeists(dt) {
  poltergeists.forEach((p) => {
    p.modeTimer -= dt;
    if (p.modeTimer <= 0) {
      p.chase = Math.random() > 0.55;
      p.modeTimer = randomBetween(1.5, 3.6);
      if (!p.chase) {
        p.vx = randomBetween(-85, 85);
        p.vy = randomBetween(-85, 85);
      }
    }

    if (p.chase) {
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const mag = Math.hypot(dx, dy) || 1;
      const chaseSpeed = 105;
      p.vx = (dx / mag) * chaseSpeed;
      p.vy = (dy / mag) * chaseSpeed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.wobble += dt * 3;

    if (p.x < p.radius || p.x > WIDTH - p.radius) {
      p.vx *= -1;
      p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, p.x));
    }
    if (p.y < p.radius || p.y > HEIGHT - p.radius) {
      p.vy *= -1;
      p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, p.y));
    }

    if (circleHit(player, p)) {
      game.score = Math.max(0, game.score - 1);
      scoreEl.textContent = String(game.score);
    }
  });
}

function drawBackground(time) {
  const pulse = 0.03 * Math.sin(time * 0.0015);
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, `rgba(${18 + pulse * 255}, 22, 35, 1)`);
  grad.addColorStop(1, '#101522');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.fillStyle = y % 96 === 0 ? 'rgba(180,210,255,0.05)' : 'rgba(80,120,170,0.03)';
    ctx.fillRect(0, y, WIDTH, 24);
  }

  obstacles.forEach((o, idx) => {
    const sway = Math.sin(time * 0.001 + idx) * 1.2;
    ctx.save();
    ctx.translate(0, sway);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 7;
    const wallGrad = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    wallGrad.addColorStop(0, '#283147');
    wallGrad.addColorStop(1, '#1b2333');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = 'rgba(176,200,255,0.16)';
    ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    ctx.restore();
  });

  utensils.forEach((u, i) => {
    const a = u.angle + Math.sin(time * 0.002 + i) * 0.35;
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(a);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#8facc4';
    ctx.fillRect(-3, -u.length / 2, 6, u.length);
    ctx.fillStyle = '#d8e7f6';
    ctx.beginPath();
    ctx.arc(0, -u.length / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawIngredient(ing, time) {
  const hover = Math.sin(time * 0.004 + ing.hoverSeed) * 3;
  const scale = 1 + Math.sin(time * 0.005 + ing.hoverSeed) * 0.05;

  ctx.save();
  ctx.translate(ing.x, ing.y + hover);
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;

  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.2, ing.type.color);
  g.addColorStop(1, '#203243');
  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.arc(0, 0, ing.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPoltergeist(p, time) {
  const s = 1 + Math.sin(p.wobble + time * 0.003) * 0.08;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);

  ctx.shadowColor = p.chase ? 'rgba(255,130,170,0.65)' : 'rgba(120,210,255,0.55)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;

  const bodyGrad = ctx.createLinearGradient(0, -20, 0, 20);
  bodyGrad.addColorStop(0, '#dcf8ff');
  bodyGrad.addColorStop(1, '#79b7e6');
  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.arc(0, -5, p.radius, Math.PI, 0, false);
  ctx.lineTo(p.radius, 16);
  ctx.quadraticCurveTo(10, 10, 3, 16);
  ctx.quadraticCurveTo(0, 20, -3, 16);
  ctx.quadraticCurveTo(-11, 10, -p.radius, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1b2233';
  ctx.beginPath();
  ctx.arc(-5, -8, 2.2, 0, Math.PI * 2);
  ctx.arc(5, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer(time) {
  const hoverY = Math.sin(player.bobPhase) * 4;
  const scale = 1 + Math.sin(time * 0.006) * 0.04;

  ctx.save();
  ctx.translate(player.x, player.y + hoverY);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(88, 240, 255, 0.7)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;

  const cloak = ctx.createRadialGradient(0, -8, 6, 0, 0, 26);
  cloak.addColorStop(0, '#ebfbff');
  cloak.addColorStop(0.6, '#9de8ff');
  cloak.addColorStop(1, '#3a7f99');
  ctx.fillStyle = cloak;

  ctx.beginPath();
  ctx.arc(0, -3, 18, Math.PI, 0, false);
  ctx.lineTo(18, 17);
  ctx.quadraticCurveTo(8, 6, 0, 16);
  ctx.quadraticCurveTo(-8, 6, -18, 17);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1a2430';
  ctx.beginPath();
  ctx.arc(-6, -7, 2.8, 0, Math.PI * 2);
  ctx.arc(6, -7, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(time) {
  drawBackground(time);
  ingredients.forEach((ing) => drawIngredient(ing, time));
  poltergeists.forEach((p) => drawPoltergeist(p, time));
  drawPlayer(time);
}

function endGame() {
  game.running = false;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h2>🕯️ Kitchen Falls Silent...</h2>
    <p>Final Score: <strong>${game.score}</strong></p>
    <p>Recipes Completed: <strong>${game.recipesDone}</strong></p>
    <p>Refresh the page to haunt the kitchen again.</p>
  `;
}

function tick(now) {
  const dt = Math.min(0.033, (now - game.lastFrame) / 1000);
  game.lastFrame = now;
  if (!game.running) {
    drawScene(now);
    return;
  }

  game.timerAccumulator += dt;
  if (game.timerAccumulator >= 1) {
    game.timerAccumulator -= 1;
    game.timeLeft -= 1;
    timeEl.textContent = String(game.timeLeft);
    if (game.timeLeft <= 0) {
      endGame();
    }
  }

  updatePlayer(dt);
  updateIngredients(now);
  updatePoltergeists(dt);
  drawScene(now);
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (e) => {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
});

function init() {
  setNewRecipe();
  for (let i = 0; i < 8; i += 1) {
    spawnIngredient();
  }
  spawnPoltergeists(5);
  requestAnimationFrame(tick);
}

init();
