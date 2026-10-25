// 启动入口：9:16 letterbox 适配 + 滑动/方向键输入 + HUD
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

const el = {
  score: document.getElementById("hud-score"),
  best: document.getElementById("hud-best"),
};
const screens = {
  start: document.getElementById("screen-start"),
  over: document.getElementById("screen-over"),
  win: document.getElementById("screen-win"),
};

const game = new Game(stage, {
  onHud({ score, best }) {
    el.score.textContent = score;
    el.best.textContent = best;
  },
  onGameOver(score) {
    document.getElementById("over-desc").textContent = `得分 ${score}`;
    screens.over.classList.remove("hidden");
  },
  onWin(score) {
    document.getElementById("win-desc").textContent = `当前得分 ${score}`;
    screens.win.classList.remove("hidden");
  },
});

/* 方向按钮 */
const bind = (id, fn) => document.getElementById(id).addEventListener("pointerdown", (e) => {
  e.preventDefault();
  fn();
});
bind("btn-up",    () => game.move(0, -1));
bind("btn-down",  () => game.move(0, 1));
bind("btn-left",  () => game.move(-1, 0));
bind("btn-right", () => game.move(1, 0));

/* 键盘方向键 */
const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};
window.addEventListener("keydown", (e) => {
  if (KEY_DIRS[e.code]) {
    e.preventDefault();
    game.move(...KEY_DIRS[e.code]);
  }
});

/* 触摸滑动 */
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
  if (Math.abs(dx) > Math.abs(dy)) game.move(Math.sign(dx), 0);
  else game.move(0, Math.sign(dy));
});

/* 新游戏 */
const newGame = () => {
  screens.start.classList.add("hidden");
  screens.over.classList.add("hidden");
  screens.win.classList.add("hidden");
  game.start();
};
document.getElementById("btn-start").addEventListener("click", newGame);
document.getElementById("btn-retry").addEventListener("click", newGame);
document.getElementById("btn-win-new").addEventListener("click", newGame);
document.getElementById("btn-continue").addEventListener("click", () => {
  screens.win.classList.add("hidden");
  game.resume();
});
document.getElementById("btn-new").addEventListener("click", newGame);
document.getElementById("btn-new-main").addEventListener("click", newGame);

fit();
