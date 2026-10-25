// 启动入口：16:9 letterbox 适配 + 输入绑定 + HUD
import { Game } from "./game.js";
import { SHAPES, COLORS } from "./pieces.js";

const stage = document.getElementById("stage");
// 手机竖屏 16:9（宽:高 = 9:16），letterbox 等比缩放
const ASPECT = 9 / 16;

/** 将 9:16 竖屏舞台等比缩放并居中（竖屏铺满，横屏/宽屏左右留黑边） */
function fit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let w = vh * ASPECT;
  let h = vh;
  if (w > vw) {
    w = vw;
    h = vw / ASPECT;
  }
  stage.style.width = `${Math.floor(w)}px`;
  stage.style.height = `${Math.floor(h)}px`;
  game && game.resize(w, h);
}
window.addEventListener("resize", fit);

// HUD 元素
const el = {
  score: document.getElementById("hud-score"),
  level: document.getElementById("hud-level"),
  lines: document.getElementById("hud-lines"),
  next: document.getElementById("next-canvas"),
};
const screens = {
  start: document.getElementById("screen-start"),
  over: document.getElementById("screen-over"),
  pause: document.getElementById("screen-pause"),
};

function drawNext(type) {
  const c = el.next.getContext("2d");
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  if (!type) return;
  const m = SHAPES[type];
  const size = 18;
  const ox = (c.canvas.width - m.length * size) / 2;
  const oy = (c.canvas.height - m.length * size) / 2;
  const color = `#${COLORS[type].toString(16).padStart(6, "0")}`;
  for (let r = 0; r < m.length; r++) {
    for (let col = 0; col < m.length; col++) {
      if (!m[r][col]) continue;
      c.fillStyle = color;
      c.fillRect(ox + col * size + 1, oy + r * size + 1, size - 2, size - 2);
    }
  }
}

const game = new Game(stage, {
  onHud({ score, level, lines, next }) {
    el.score.textContent = score;
    el.level.textContent = level;
    el.lines.textContent = lines;
    drawNext(next);
  },
  onGameOver(score) {
    document.getElementById("over-desc").textContent = `本局得分 ${score}`;
    screens.over.classList.remove("hidden");
  },
});

/* 按钮 */
const hold = (btn, onDown, onUp) => {
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); onDown(); });
  btn.addEventListener("pointerup", () => onUp && onUp());
  btn.addEventListener("pointerleave", () => onUp && onUp());
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
};
hold(document.getElementById("btn-left"),   () => game.move(-1));
hold(document.getElementById("btn-right"),  () => game.move(1));
hold(document.getElementById("btn-rotate"), () => game.rotate());
hold(document.getElementById("btn-soft"),   () => game.setSoftDrop(true), () => game.setSoftDrop(false));
hold(document.getElementById("btn-hard"),   () => game.hardDrop());

/* 键盘（桌面端） */
const keyMap = {
  ArrowLeft:  () => game.move(-1),
  ArrowRight: () => game.move(1),
  ArrowUp:    () => game.rotate(),
  KeyZ:       () => game.rotate(),
  ArrowDown:  () => game.setSoftDrop(true),
  Space:      () => game.hardDrop(),
  KeyP:       () => togglePause(),
};
window.addEventListener("keydown", (e) => {
  if (keyMap[e.code]) {
    e.preventDefault();
    keyMap[e.code]();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") game.setSoftDrop(false);
});

/* 遮罩层流程 */
document.getElementById("btn-start").addEventListener("click", () => {
  screens.start.classList.add("hidden");
  game.start();
});
document.getElementById("btn-retry").addEventListener("click", () => {
  screens.over.classList.add("hidden");
  game.start();
});
document.getElementById("btn-resume").addEventListener("click", () => {
  screens.pause.classList.add("hidden");
  game.resume();
});
function togglePause() {
  if (game.state === "running") {
    game.pause();
    screens.pause.classList.remove("hidden");
  } else if (game.state === "paused") {
    screens.pause.classList.add("hidden");
    game.resume();
  }
}

fit();
