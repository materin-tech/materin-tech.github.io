// 俄罗斯方块核心：游戏逻辑 + three.js 2D 渲染（正交相机，纯平面）
import * as THREE from "three";
import { COLS, ROWS, SHAPES, COLORS, rotateMatrix, createBag } from "./pieces.js";
import { sfx } from "./audio.js";

const DROP_SPEEDS = [800, 720, 630, 550, 470, 380, 300, 240, 180, 140, 110, 90, 75, 65, 55];
const CLEAR_FLASH_MS = 180;
const LINE_SCORES = [0, 100, 300, 500, 800];

// 世界坐标：棋盘 10x20，格子边长 1；gy=0 是棋盘顶行（重力方向 = gy 增大）
// 屏幕映射：gy 越大越靠下。视口垂直范围 [VIEW_BOTTOM, VIEW_TOP]，棋盘含边框 -0.6..19.6
const BOARD_W = COLS;      // 10
const BOARD_H = ROWS;      // 20
const VIEW_H = 26.6;       // 视口高度（世界单位），棋盘上下留边给 HUD 与按钮
const VIEW_TOP = 22.6;
const VIEW_BOTTOM = -4;
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);

export class Game {
  constructor(container, { onHud, onGameOver } = {}) {
    this.container = container;
    this.onHud = onHud || (() => {});
    this.onGameOver = onGameOver || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101623);

    // 正交相机 → 纯 2D 视角
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this._buildBoard();

    this.grid = [];            // 已锁定格子：grid[y][x] = mesh | null
    this.piece = null;         // { type, matrix, x, y }
    this.cubes = [];           // 当前方块的 4 个 mesh
    this.ghost = [];           // 落点预览的 4 个 mesh
    this.nextType = null;
    this.tweens = [];          // 简易补间 { t, dur, update, done }
    this.dropTimer = 0;
    this.softDrop = false;
    this.state = "idle";       // idle | running | clearing | over | paused
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.nextBag = createBag();

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    this.renderer.setAnimationLoop(this._loop);
  }

  /* ---------- 场景搭建（全平面，无光照） ---------- */

  _quad(w, h, color, opacity = 1) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: opacity < 1, opacity,
    });
    return new THREE.Mesh(geo, mat);
  }

  _buildBoard() {
    // 棋盘世界坐标：格子中心 y = 0.5(顶行)..19.5(底行)，含边框范围 -0.08..20.08
    const cy = BOARD_H / 2; // 10，棋盘几何中心
    // 棋盘底板
    const panel = this._quad(BOARD_W + 0.5, BOARD_H + 0.5, 0x161f30);
    panel.position.set(0, cy, -0.2);
    this.scene.add(panel);
    // 网格线
    const pts = [];
    for (let x = 0; x <= COLS; x++) {
      pts.push(x - BOARD_W / 2, 0, 0, x - BOARD_W / 2, BOARD_H, 0);
    }
    for (let y = 0; y <= ROWS; y++) {
      pts.push(-BOARD_W / 2, y, 0, BOARD_W / 2, y, 0);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.scene.add(new THREE.LineSegments(gridGeo,
      new THREE.LineBasicMaterial({ color: 0x22314c })));
    // 边框
    const t = 0.16;
    const borders = [
      [BOARD_W + t * 2, t, 0, BOARD_H + t / 2],   // 上
      [BOARD_W + t * 2, t, 0, -t / 2],            // 下
      [t, BOARD_H + t * 2, -BOARD_W / 2 - t / 2, cy], // 左
      [t, BOARD_H + t * 2, BOARD_W / 2 + t / 2, cy],  // 右
    ];
    for (const [w, h, x, y] of borders) {
      const b = this._quad(w, h, 0x33507a);
      b.position.set(x, y, -0.1);
      this.scene.add(b);
    }
  }

  _cell(color, opacity = 1) {
    const geo = this._cellGeo || (this._cellGeo = new THREE.PlaneGeometry(0.92, 0.92));
    const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
    return new THREE.Mesh(geo, mat);
  }

  _worldPos(gx, gy) {
    // gy=0 顶行 → 屏幕 y 最大；gy=19 底行 → 屏幕 y 最小
    return new THREE.Vector3(gx - BOARD_W / 2 + 0.5, ROWS - 0.5 - gy, 0);
  }

  /* ---------- 游戏流程 ---------- */

  start() {
    this._reset();
    this.state = "running";
    this.nextType = this.nextBag();
    this._spawnPiece();
    sfx.start();
    this._emitHud();
  }

  pause() { if (this.state === "running") this.state = "paused"; }
  resume() { if (this.state === "paused") this.state = "running"; }

  _reset() {
    for (const row of this.grid) for (const m of row) if (m) this.scene.remove(m);
    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    for (const m of [...this.cubes, ...this.ghost]) this.scene.remove(m);
    this.cubes = [];
    this.ghost = [];
    this.piece = null;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.dropTimer = 0;
    this.tweens = [];
  }

  _spawnPiece() {
    const type = this.nextType;
    this.nextType = this.nextBag();
    const matrix = SHAPES[type].map((r) => [...r]);
    const piece = { type, matrix, x: Math.floor((COLS - matrix.length) / 2), y: -this._topOffset(matrix) };
    if (this._collides(piece.matrix, piece.x, piece.y)) {
      this.state = "over";
      sfx.over();
      this.onGameOver(this.score);
      return;
    }
    this.piece = piece;
    this._rebuildActiveCells();
    this._emitHud();
  }

  _topOffset(matrix) {
    return matrix.findIndex((r) => r.some((v) => v));
  }

  _collides(matrix, ox, oy) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (!matrix[r][c]) continue;
        const x = ox + c;
        const y = oy + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && this.grid[y][x]) return true;
      }
    }
    return false;
  }

  /* ---------- 操作 ---------- */

  move(dx) {
    if (this.state !== "running" || !this.piece) return false;
    const { matrix, x, y } = this.piece;
    if (this._collides(matrix, x + dx, y)) return false;
    this.piece.x += dx;
    sfx.move();
    this._rebuildActiveCells();
    return true;
  }

  rotate() {
    if (this.state !== "running" || !this.piece) return false;
    const { matrix, x, y, type } = this.piece;
    if (type === "O") return false;
    const rotated = rotateMatrix(matrix);
    // 简易 wall kick：原位 → 左 → 右 → 上 → 远左 → 远右
    for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]]) {
      if (!this._collides(rotated, x + kx, y + ky)) {
        this.piece.matrix = rotated;
        this.piece.x += kx;
        this.piece.y += ky;
        sfx.rotate();
        this._rebuildActiveCells();
        return true;
      }
    }
    return false;
  }

  setSoftDrop(on) {
    this.softDrop = on;
  }

  hardDrop() {
    if (this.state !== "running" || !this.piece) return;
    while (!this._collides(this.piece.matrix, this.piece.x, this.piece.y + 1)) {
      this.piece.y++;
    }
    sfx.hard();
    this._rebuildActiveCells();
    this._lockPiece();
  }

  /* ---------- 重力与锁定 ---------- */

  _stepDown() {
    const p = this.piece;
    if (!this._collides(p.matrix, p.x, p.y + 1)) {
      p.y++;
      this._rebuildActiveCells();
    } else {
      this._lockPiece();
    }
  }

  _lockPiece() {
    const { matrix, x, y, type } = this.piece;
    let overflow = false;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (!matrix[r][c]) continue;
        const gy = y + r;
        if (gy < 0) { overflow = true; continue; }
        const cell = this._cell(COLORS[type]);
        cell.position.copy(this._worldPos(x + c, gy));
        this.scene.add(cell);
        this.grid[gy][x + c] = cell;
      }
    }
    for (const m of [...this.cubes, ...this.ghost]) this.scene.remove(m);
    this.cubes = [];
    this.ghost = [];
    this.piece = null;
    sfx.lock();

    if (overflow) {
      this.state = "over";
      sfx.over();
      this.onGameOver(this.score);
      return;
    }

    const full = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r].every((m) => m)) full.push(r);
    }
    if (full.length > 0) this._clearLines(full);
    else this._spawnPiece();
  }

  _clearLines(rows) {
    this.state = "clearing";
    for (const r of rows) {
      for (const m of this.grid[r]) {
        m.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      }
    }
    this._tween(CLEAR_FLASH_MS, () => {}, () => this._applyClear(rows));
  }

  _applyClear(rows) {
    const cleared = rows.length;
    for (const r of rows) {
      for (const m of this.grid[r]) this.scene.remove(m);
      this.grid.splice(r, 1);
      this.grid.unshift(new Array(COLS).fill(null));
    }
    // 消行后统一重算所有锁定格位置
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const m = this.grid[y][x];
        if (m) m.position.copy(this._worldPos(x, y));
      }
    }

    this.lines += cleared;
    this.score += LINE_SCORES[cleared] * this.level;
    this.level = Math.min(15, Math.floor(this.lines / 10) + 1);
    sfx.clear();
    this._emitHud();
    this.state = "running";
    this._spawnPiece();
  }

  _tween(dur, update, done) {
    this.tweens.push({ t: 0, dur: dur / 1000, update, done });
  }

  /* ---------- 渲染同步 ---------- */

  _rebuildActiveCells() {
    const p = this.piece;
    if (!p) return;
    for (const m of this.cubes) this.scene.remove(m);
    for (const m of this.ghost) this.scene.remove(m);
    this.cubes = [];
    this.ghost = [];

    const color = COLORS[p.type];
    for (let r = 0; r < p.matrix.length; r++) {
      for (let c = 0; c < p.matrix.length; c++) {
        if (!p.matrix[r][c]) continue;
        this.cubes.push(this._cell(color));
        this.scene.add(this.cubes[this.cubes.length - 1]);
        // 落点预览（半透明）
        const g = this._cell(color, 0.22);
        this.ghost.push(g);
        this.scene.add(g);
      }
    }
    this._syncActiveCells();
  }

  _syncActiveCells() {
    const p = this.piece;
    if (!p) return;
    let ghostY = p.y;
    while (!this._collides(p.matrix, p.x, ghostY + 1)) ghostY++;
    let i = 0;
    for (let r = 0; r < p.matrix.length; r++) {
      for (let c = 0; c < p.matrix.length; c++) {
        if (!p.matrix[r][c]) continue;
        this.cubes[i].position.copy(this._worldPos(p.x + c, p.y + r));
        this.ghost[i].visible = ghostY !== p.y;
        this.ghost[i].position.copy(this._worldPos(p.x + c, ghostY + r));
        i++;
      }
    }
  }

  _emitHud() {
    this.onHud({ score: this.score, level: this.level, lines: this.lines, next: this.nextType });
  }

  /* ---------- 主循环 ---------- */

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.update(easeOutCubic(k));
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done && tw.done();
      }
    }

    if (this.state === "running" && this.piece) {
      const interval = (DROP_SPEEDS[this.level - 1] || 55) / 1000;
      const speed = this.softDrop ? Math.min(interval, 0.05) : interval;
      this.dropTimer += dt;
      if (this.dropTimer >= speed) {
        this.dropTimer = 0;
        this._stepDown();
      }
      this._syncActiveCells();
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    // 正交视口：垂直范围固定（棋盘完整可见），宽度随画布比例（画布恒定 9:16）
    const viewW = VIEW_H * (w / h);
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = VIEW_TOP;
    this.camera.bottom = VIEW_BOTTOM;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
