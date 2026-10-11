export const WIDTH = 1000;
export const HEIGHT = 625;
export const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const star = (x, y, vx = 0, vy = 0) => ({ x, y, vx, vy });
const hazard = (x, y, x2 = x, y2 = y, r = 24, period = 7, phase = 0) => ({ x, y, x2, y2, r, period, phase });
export const LEVELS = [
  { name: ['第一束光', 'First light'], subtitle: ['每一颗星，都值得被找到。', 'A small beginning. A sky full of friends.'], tip: ['靠近小星，再放慢一点。它们会跟随你的引力。', 'Approach the little planets. Slow down to welcome them into orbit.'], goal: 3, spawn: [150, 320], portal: [855, 320], stars: [star(335, 235), star(510, 405), star(670, 235)], hazards: [], wells: [] },
  { name: ['温柔的引力', 'A gentle pull'], subtitle: ['慢下来，让宇宙靠近你。', 'Slow down. Let the universe come to you.'], tip: ['按住空格，或点亮「收束」。引力范围会扩大，移动更稳。', 'Hold Space or toggle Focus: a wider gravity field and slower movement.'], goal: 4, spawn: [150, 315], portal: [865, 310], stars: [star(330, 185, 20, 14), star(380, 440, -15, 18), star(600, 185, 16, -12), star(730, 435, -13, -8)], hazards: [hazard(510, 310, 510, 310, 34)], wells: [] },
  { name: ['流星的节拍', 'Meteor waltz'], subtitle: ['危险也有自己的节奏。', 'Even danger has a rhythm.'], tip: ['观察红色流星的路径，从它身后通过。碰撞会掉落一颗卫星。', 'Watch the red meteor paths. Pass behind them. A hit releases one companion.'], goal: 4, spawn: [145, 305], portal: [860, 300], stars: [star(290, 170), star(305, 465), star(610, 175), star(700, 450), star(835, 145)], hazards: [hazard(460, 160, 460, 470, 25, 8), hazard(715, 300, 860, 490, 23, 9, 1)], wells: [] },
  { name: ['双星之间', 'Between two suns'], subtitle: ['有些相遇，需要一点坚持。', 'Some friendships take a little patience.'], tip: ['紫色引力井拉住附近的小星。保持收束，靠近它们的轨道。', 'Violet gravity wells hold nearby planets. Focus and approach their orbits.'], goal: 5, spawn: [145, 310], portal: [875, 310], stars: [star(310, 170), star(380, 425), star(515, 240, 0, 23), star(725, 170), star(770, 435), star(555, 480)], hazards: [hazard(660, 305, 750, 305, 24, 8)], wells: [{ x: 495, y: 355, r: 29, strength: 48000 }] },
  { name: ['远行的勇气', 'Letting go'], subtitle: ['环绕，是另一种自由。', 'An orbit is another kind of freedom.'], tip: ['进阶：按 E 释放一颗卫星，它会沿切线飞出；靠近后可再次捕获。释放不是通关必需。', 'Optional: E releases a companion along its tangent. You can catch it again. Releasing is never required.'], goal: 5, spawn: [140, 320], portal: [870, 315], stars: [star(285, 170), star(290, 465), star(460, 175), star(570, 460), star(755, 180), star(785, 465)], hazards: [hazard(420, 300, 600, 300, 25, 8), hazard(690, 200, 690, 465, 25, 10, 2)], wells: [] },
  { name: ['引力花园', 'The gravity garden'], subtitle: ['把散落的光，织成星座。', 'Gather the scattered light into a constellation.'], tip: ['先绕过引力井的核心，再靠近小星。护盾只在碰撞时消耗。', 'Circle the gravity well cores, then approach the planets. Shields only drain on a hit.'], goal: 6, spawn: [125, 315], portal: [875, 315], stars: [star(255, 160), star(240, 465), star(435, 300), star(565, 180), star(550, 455), star(760, 155), star(780, 470)], hazards: [hazard(490, 305, 640, 305, 24, 8)], wells: [{ x: 360, y: 210, r: 27, strength: 45000 }, { x: 680, y: 415, r: 27, strength: 45000 }] },
  { name: ['穿过长夜', 'Through the long night'], subtitle: ['别怕，你并不是独自发光。', 'You are not the only light out here.'], tip: ['星门只需要目标数量。想拿满三枚星徽，就带上所有伙伴，并避免碰撞。', 'Only the quota is needed. For three medals, rescue every planet without taking a hit.'], goal: 6, spawn: [125, 320], portal: [875, 310], stars: [star(260, 155), star(255, 460), star(440, 155), star(475, 465), star(620, 170), star(660, 460), star(820, 155)], hazards: [hazard(355, 175, 355, 460, 25, 9), hazard(595, 165, 595, 470, 24, 10, 2), hazard(770, 220, 865, 445, 23, 9, 4)], wells: [] },
  { name: ['每一颗星都活着', 'Every star is alive'], subtitle: ['带着整个小小星系，一起回家。', 'Take your little solar system home.'], tip: ['这是最后一次远航。没有倒计时；观察、收束，然后带大家穿过星门。', 'One last voyage. There is no time limit. Observe, focus, and bring your companions home.'], goal: 7, spawn: [120, 315], portal: [885, 315], stars: [star(250, 155), star(265, 465), star(425, 155), star(425, 465), star(620, 155), star(620, 465), star(795, 145), star(805, 470)], hazards: [hazard(335, 190, 335, 450, 23, 9), hazard(725, 180, 725, 455, 24, 11, 3)], wells: [{ x: 525, y: 310, r: 30, strength: 56000 }] }
];

export function createGame(levelIndex = 0, relaxed = false) {
  const index = clamp(Math.floor(Number(levelIndex) || 0), 0, LEVELS.length - 1);
  const level = LEVELS[index];
  return {
    levelIndex: index, level, relaxed, phase: 'playing', elapsed: 0, hits: 0, captures: 0,
    player: { x: level.spawn[0], y: level.spawn[1], vx: 0, vy: 0, r: 16, hp: relaxed ? 5 : 3, invincible: 0 },
    stars: level.stars.map((s, id) => ({ ...s, id, r: 7 + id % 3, state: 'free', angle: id * 2.4, radius: 0, omega: 0, cooldown: 0, rescued: false })),
    hazards: level.hazards.map(h => ({ ...h, originX: h.x, originY: h.y })),
    wells: level.wells.map(w => ({ ...w })),
    portal: { x: level.portal[0], y: level.portal[1], r: 32, open: false },
    events: [], input: { dx: 0, dy: 0, target: null, focus: false }, focus: false
  };
}

export const orbitCount = game => game.stars.filter(s => s.state === 'orbit').length;

export function captureStar(game, s) {
  if (s.state !== 'free' || s.cooldown > 0) return false;
  const count = orbitCount(game);
  s.state = 'orbit';
  s.radius = 47 + Math.floor(count / 3) * 21;
  s.angle = Math.atan2(s.y - game.player.y, s.x - game.player.x);
  s.omega = (1.3 - Math.floor(count / 3) * .19) * (s.id % 2 ? -1 : 1);
  s.rescued = true;
  game.captures++;
  game.events.push({ type: 'capture', x: s.x, y: s.y, count: count + 1 });
  return true;
}

export function releaseStar(game, damaged = false) {
  if (game.phase !== 'playing') return false;
  const s = game.stars.filter(s => s.state === 'orbit').at(-1);
  if (!s) return false;
  const p = game.player;
  s.x = clamp(p.x + Math.cos(s.angle) * s.radius, 16, WIDTH - 16);
  s.y = clamp(p.y + Math.sin(s.angle) * s.radius, 16, HEIGHT - 16);
  s.vx = p.vx - Math.sin(s.angle) * s.radius * s.omega * 1.55;
  s.vy = p.vy + Math.cos(s.angle) * s.radius * s.omega * 1.55;
  s.state = 'free';
  s.cooldown = damaged ? 1 : 1.35;
  game.events.push({ type: 'release', x: s.x, y: s.y });
  game.portal.open = orbitCount(game) >= game.level.goal;
  return true;
}

function pull(s, source, strength, dt, maxRange) {
  const dx = source.x - s.x, dy = source.y - s.y;
  const d = Math.hypot(dx, dy);
  if (d > maxRange || d < 1) return;
  const force = Math.min(155, strength / Math.max(900, d * d));
  s.vx += dx / d * force * dt;
  s.vy += dy / d * force * dt;
}

function hit(game, source) {
  const p = game.player;
  if (p.invincible > 0) return;
  game.hits++;
  p.hp--;
  p.invincible = 2.2;
  releaseStar(game, true);
  const a = Math.atan2(p.y - source.y, p.x - source.x);
  p.vx = Math.cos(a) * 210;
  p.vy = Math.sin(a) * 210;
  game.events.push({ type: 'hit', x: p.x, y: p.y });
  if (p.hp <= 0) {
    game.phase = 'lost';
    game.events.push({ type: 'lost', x: p.x, y: p.y });
  }
}

function substep(game, input, dt) {
  const p = game.player;
  game.elapsed += dt;
  p.invincible = Math.max(0, p.invincible - dt);
  game.focus = Boolean(input.focus);
  const maxSpeed = game.focus ? 88 : 205;
  let vx = 0, vy = 0;
  if (input.dx || input.dy) {
    const len = Math.hypot(input.dx, input.dy);
    vx = input.dx / len * maxSpeed;
    vy = input.dy / len * maxSpeed;
  } else if (input.target) {
    const dx = input.target.x - p.x, dy = input.target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) { const speed = Math.min(maxSpeed, d * 5); vx = dx / d * speed; vy = dy / d * speed; }
  }
  const blend = 1 - Math.exp(-dt * 8);
  p.vx += (vx - p.vx) * blend;
  p.vy += (vy - p.vy) * blend;
  p.x = clamp(p.x + p.vx * dt, 22, WIDTH - 22);
  p.y = clamp(p.y + p.vy * dt, 22, HEIGHT - 22);
  if (p.x === 22 || p.x === WIDTH - 22) p.vx = 0;
  if (p.y === 22 || p.y === HEIGHT - 22) p.vy = 0;

  for (const h of game.hazards) {
    const t = game.elapsed * (game.relaxed ? .7 : 1);
    const progress = (1 - Math.cos((t / h.period) * TAU + h.phase)) / 2;
    h.x = h.originX + (h.x2 - h.originX) * progress;
    h.y = h.originY + (h.y2 - h.originY) * progress;
    if (distance(p, h) < p.r + h.r - 4) hit(game, h);
  }
  for (const w of game.wells) if (distance(p, w) < p.r + w.r - 6) hit(game, w);

  for (const s of game.stars) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.state === 'orbit') {
      s.angle += s.omega * dt;
      s.x = p.x + Math.cos(s.angle) * s.radius;
      s.y = p.y + Math.sin(s.angle) * s.radius;
      continue;
    }
    pull(s, p, game.focus ? 390000 : 190000, dt, game.focus ? 230 : 160);
    for (const w of game.wells) {
      pull(s, w, w.strength, dt, 150);
      const d = distance(s, w);
      if (d < w.r + 25) {
        const a = Math.atan2(s.y - w.y, s.x - w.x);
        s.x = w.x + Math.cos(a) * (w.r + 25);
        s.y = w.y + Math.sin(a) * (w.r + 25);
        s.vx += -Math.sin(a) * 80 * dt;
        s.vy += Math.cos(a) * 80 * dt;
      }
    }
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > 140) { s.vx *= 140 / speed; s.vy *= 140 / speed; }
    const damping = Math.exp(-dt * .13);
    s.vx *= damping; s.vy *= damping;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 20 || s.x > WIDTH - 20) { s.x = clamp(s.x, 20, WIDTH - 20); s.vx *= -.85; }
    if (s.y < 20 || s.y > HEIGHT - 20) { s.y = clamp(s.y, 20, HEIGHT - 20); s.vy *= -.85; }
    const relSpeed = Math.hypot(s.vx - p.vx, s.vy - p.vy);
    if (distance(s, p) < (game.focus ? 83 : 56) && relSpeed < (game.focus ? 210 : 150)) captureStar(game, s);
  }
  const ready = orbitCount(game) >= game.level.goal;
  if (ready && !game.portal.open) game.events.push({ type: 'portal', x: game.portal.x, y: game.portal.y });
  game.portal.open = ready;
  if (game.phase === 'playing' && ready && distance(p, game.portal) < 36) {
    game.phase = 'won';
    game.events.push({ type: 'won', x: p.x, y: p.y });
  }
}

export function update(game, input = {}, elapsed = 1 / 60) {
  if (game.phase !== 'playing') return game;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return game;
  const dt = Math.min(elapsed, .1);
  const steps = Math.ceil(dt / (1 / 120));
  for (let i = 0; i < steps && game.phase === 'playing'; i++) substep(game, input, dt / steps);
  return game;
}

export function medals(game) {
  if (game.phase !== 'won') return 0;
  const everyone = orbitCount(game) === game.stars.length;
  return 1 + Number(everyone) + Number(everyone && game.hits === 0);
}

export function readProgress(value) {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || data.version !== 1) throw new Error('version');
    const unlocked = clamp(Math.floor(Number(data.unlocked) || 0), 0, LEVELS.length - 1);
    const records = {};
    for (let i = 0; i < LEVELS.length; i++) {
      const r = data.records?.[i];
      if (r && Number.isFinite(r.time) && r.time > 0 && Number.isInteger(r.medals) && r.medals >= 1 && r.medals <= 3) records[i] = { time: r.time, medals: r.medals };
    }
    return { version: 1, unlocked, records };
  } catch { return { version: 1, unlocked: 0, records: {} }; }
}

export function recordWin(progress, game) {
  if (game.phase !== 'won') return progress;
  const next = readProgress(progress), i = game.levelIndex, old = next.records[i];
  next.unlocked = Math.max(next.unlocked, Math.min(LEVELS.length - 1, i + 1));
  next.records[i] = { time: Math.min(old?.time ?? Infinity, game.elapsed), medals: Math.max(old?.medals ?? 0, medals(game)) };
  return next;
}

export function mergeProgress(first, second) {
  const a = readProgress(first), b = readProgress(second);
  const merged = { version: 1, unlocked: Math.max(a.unlocked, b.unlocked), records: { ...a.records } };
  for (const [index, record] of Object.entries(b.records)) {
    const old = merged.records[index];
    merged.records[index] = { time: Math.min(old?.time ?? Infinity, record.time), medals: Math.max(old?.medals ?? 0, record.medals) };
  }
  return merged;
}
