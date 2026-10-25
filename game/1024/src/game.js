// 1024 程序员版：2048 引擎的程序员梗变体
// Bug → Typo → 警告 → 异常 → 热修 → 调试 → 重构 → 评审 → 发布 → 上线(1024)
import * as THREE from "three";
import { sfx } from "./audio.js";

const N = 4;
const TILE = 1;
const GAP = 0.1;
const BOARD = N * TILE + (N - 1) * GAP;
const VIEW_H = 9.8;  // 棋盘几乎占满竖屏宽度
const VIEW_TOP = VIEW_H / 2 - 0.3;    // 棋盘略偏上，给底部按钮留更多空间
const VIEW_BOTTOM = -VIEW_H / 2 - 0.3;

const WIN_VALUE = 1024;

// 等级 → 程序员梗
const LABELS = {
  2: "Bug", 4: "Typo", 8: "警告", 16: "异常",
  32: "热修", 64: "调试", 128: "重构", 256: "评审",
  512: "发布", 1024: "上线", 2048: "绩效3.75", 4096: "提前退休",
};
// 浅色底用深色文字
const LIGHT_TILES = new Set(["Bug", "Typo"]);

const COLORS = {
  2: "#cfd8dc", 4: "#b0bec5", 8: "#80cbc4", 16: "#4dd0e1",
  32: "#29b6f6", 64: "#42a5f5", 128: "#5c6bc0", 256: "#7e57c2",
  512: "#ab47bc", 1024: "#ef5350", 2048: "#ffca28", 4096: "#ffd54f",
};

const BEST_KEY = "game1024-best";

export class Game {
  constructor(container, { onHud, onGameOver, onWin } = {}) {
    this.container = container;
    this.onHud = onHud || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.onWin = onWin || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101623);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this._buildBoard();

    this.board = [];
    this.tileMeshes = [];
    this.score = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.won = false;
    this.state = "idle";
    this.pops = [];
    this.tweens = [];
    this._texCache = new Map();

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    this.renderer.setAnimationLoop(this._loop);
  }

  /* ---------- 场景 ---------- */

  _buildBoard() {
    const pad = 0.25;
    const boardQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD + pad * 2, BOARD + pad * 2),
      new THREE.MeshBasicMaterial({ color: 0x2a3b52 })
    );
    this.scene.add(boardQuad);

    const cellGeo = new THREE.PlaneGeometry(TILE, TILE);
    const cellMat = new THREE.MeshBasicMaterial({ color: 0x1c2940 });
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const m = new THREE.Mesh(cellGeo, cellMat);
        const p = this._cellPos(r, c);
        m.position.set(p.x, p.y, -0.05);
        this.scene.add(m);
      }
    }
  }

  _cellPos(r, c) {
    const origin = -(BOARD - TILE) / 2;
    return {
      x: origin + c * (TILE + GAP),
      y: -origin - r * (TILE + GAP),
    };
  }

  /** 瓦片纹理：圆角底 + 梗词（按值缓存） */
  _tileTexture(value) {
    if (this._texCache.has(value)) return this._texCache.get(value);
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.roundRect(2, 2, size - 4, size - 4, 14);
    ctx.fillStyle = COLORS[value] || "#455a64";
    ctx.fill();

    const label = LABELS[value] || String(value);
    const fontSize = label.length >= 5 ? 30 : label.length >= 3 ? 38 : 48;
    ctx.font = `bold ${fontSize}px -apple-system, "PingFang SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = LIGHT_TILES.has(label) ? "#37474f" : "#ffffff";
    ctx.fillText(label, size / 2, size / 2 + 3);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._texCache.set(value, tex);
    return tex;
  }

  /* ---------- 流程 ---------- */

  start() {
    for (const row of this.tileMeshes) {
      for (const m of row) if (m) this.scene.remove(m);
    }
    this.board = Array.from({ length: N }, () => new Array(N).fill(0));
    this.tileMeshes = Array.from({ length: N }, () => new Array(N).fill(null));
    this.score = 0;
    this.won = false;
    this.pops = [];
    this.tweens = [];
    this._spawn();
    this._spawn();
    this._renderTiles();
    this.state = "running";
    sfx.start();
    this._emitHud();
  }

  pause() { if (this.state === "running") this.state = "paused"; }
  resume() { if (this.state === "paused") this.state = "running"; }

  _spawn() {
    const empty = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!this.board[r][c]) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
    this.pops.push([r, c]);
  }

  move(dx, dy) {
    if (this.state !== "running") return false;
    const before = JSON.stringify(this.board);
    this.pops = [];
    let gained = 0;

    const lines = [];
    for (let i = 0; i < N; i++) {
      const line = [];
      for (let j = 0; j < N; j++) {
        // line[0] 必须是移动方向的最近端：合并结果依次写回近端
        if (dy === -1) line.push([j, i]);              // 向上：从顶行开始
        else if (dy === 1) line.push([N - 1 - j, i]);  // 向下：从底行开始
        else if (dx === -1) line.push([i, j]);         // 向左：从左列开始
        else line.push([i, N - 1 - j]);                // 向右：从右列开始
      }
      lines.push(line);
    }

    for (const line of lines) {
      const values = line.map(([r, c]) => this.board[r][c]).filter((v) => v);
      const merged = [];
      for (let k = 0; k < values.length; k++) {
        if (k + 1 < values.length && values[k] === values[k + 1]) {
          merged.push(values[k] * 2);
          gained += values[k] * 2;
          k++;
        } else {
          merged.push(values[k]);
        }
      }
      line.forEach(([r, c], idx) => {
        const v = merged[idx] || 0;
        if (v && this.board[r][c] && this.board[r][c] * 2 === v) {
          this.pops.push([r, c]);
        }
        this.board[r][c] = v;
      });
    }

    if (JSON.stringify(this.board) === before) return false;

    if (gained > 0) {
      this.score += gained;
      sfx.clear();
    } else {
      sfx.move();
    }
    this._spawn();
    this._renderTiles();
    this._emitHud();

    if (!this.won && this.board.flat().some((v) => v >= WIN_VALUE)) {
      this.won = true;
      this.state = "paused";
      this.onWin(this.score);
    } else if (this._isDead()) {
      this.state = "over";
      sfx.over();
      this.onGameOver(this.score);
    }
    return true;
  }

  _isDead() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!this.board[r][c]) return false;
        if (c + 1 < N && this.board[r][c] === this.board[r][c + 1]) return false;
        if (r + 1 < N && this.board[r][c] === this.board[r + 1][c]) return false;
      }
    }
    return true;
  }

  _emitHud() {
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.onHud({ score: this.score, best: this.best });
  }

  /* ---------- 渲染 ---------- */

  _renderTiles() {
    for (const row of this.tileMeshes) {
      for (const m of row) if (m) this.scene.remove(m);
    }
    this.tileMeshes = Array.from({ length: N }, () => new Array(N).fill(null));

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = this.board[r][c];
        if (!v) continue;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE, TILE),
          new THREE.MeshBasicMaterial({ map: this._tileTexture(v), transparent: true })
        );
        mesh.userData.isTile = true;
        const p = this._cellPos(r, c);
        mesh.position.set(p.x, p.y, 0);
        this.scene.add(mesh);
        this.tileMeshes[r][c] = mesh;
        if (this.pops.some(([pr, pc]) => pr === r && pc === c)) {
          mesh.scale.set(0.3, 0.3, 1);
          this._tween(0.16, (k) => {
            const s = 0.3 + 0.7 * k;
            mesh.scale.set(s, s, 1);
          }, () => mesh.scale.set(1, 1, 1));
        }
      }
    }
  }

  _tween(dur, update, done) {
    this.tweens.push({ t: 0, dur, update, done });
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.update(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done && tw.done();
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    const viewW = VIEW_H * (w / h);
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = VIEW_TOP;
    this.camera.bottom = VIEW_BOTTOM;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
