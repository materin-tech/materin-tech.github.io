// 启动入口：9:16 letterbox 适配 + 方向键/滑动输入 + HUD
import { Game } from "./game.js";

const stage = document.getElementById("stage");
const ASPECT = 9 / 16; // 手机竖屏 16:9（宽:高 = 9:16）

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
  game.resize(w, h);
}
window.addEventListener("resize", fit);

const el = { score: document.getElementById("hud-score") };
const screens = {
  start: document.getElementById("screen-start"),
  over: document.getElementById("screen-over"),
  pause: document.getElementById("screen-pause"),
};

const game = new Game(stage, {
  onHud({ score }) {
    el.score.textContent = score;
  },
  onGameOver(score, win) {
    document.getElementById("over-desc").textContent =
      win ? `通关！蛇占满了全场 · 得分 ${score}` : `得分 ${score}`;
    screens.over.classList.remove("hidden");
  },
});

/* 方向按钮 */
const bind = (id, fn) => document.getElementById(id).addEventListener("pointerdown", (e) => {
  e.preventDefault();
  fn();
});
bind("btn-up",    () => game.setDir(0, -1));
bind("btn-down",  () => game.setDir(0, 1));
bind("btn-left",  () => game.setDir(-1, 0));
bind("btn-right", () => game.setDir(1, 0));

/* 键盘：方向键 / WASD */
const KEY_DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
window.addEventListener("keydown", (e) => {
  if (KEY_DIRS[e.code]) {
    e.preventDefault();
    game.setDir(...KEY_DIRS[e.code]);
  } else if (e.code === "KeyP") {
    togglePause();
  }
});

/* 触摸滑动（在画布上滑） */
let touchStart = null;
stage.addEventListener("pointerdown", (e) => {
  touchStart = { x: e.clientX, y: e.clientY };
});
stage.addEventListener("pointerup", (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) game.setDir(Math.sign(dx), 0);
  else game.setDir(0, Math.sign(dy));
});

/* 暂停 */
const pauseBtns = ["btn-pause", "btn-pause-main"];
for (const id of pauseBtns) {
  document.getElementById(id).addEventListener("click", togglePause);
}
function togglePause() {
  if (game.state === "running") {
    game.pause();
    screens.pause.classList.remove("hidden");
  } else if (game.state === "paused") {
    screens.pause.classList.add("hidden");
    game.resume();
  }
}

/* 开始 / 重开 */
document.getElementById("btn-start").addEventListener("click", () => {
  screens.start.classList.add("hidden");
  game.start();
});
document.getElementById("btn-retry").addEventListener("click", () => {
  screens.over.classList.add("hidden");
  game.start();
});

fit();
