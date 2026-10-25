// 贪吃蛇核心：游戏逻辑 + three.js 2D 渲染（正交相机）
import * as THREE from "three";
import { sfx } from "./audio.js";

// 网格：COLS x ROWS，y=0 为顶行（与渲染映射一致）
const COLS = 11;
const ROWS = 17;
const VIEW_H = 23;
const VIEW_TOP = 19.5;
const VIEW_BOTTOM = -3.5;
const BASE_INTERVAL = 0.22;   // 初始每步间隔（秒）
const MIN_INTERVAL = 0.09;

const HEAD_COLOR = 0x4fc3f7;
const BODY_COLOR = 0x66bb6a;
const FOOD_COLOR = 0xef5350;

export class Game {
  constructor(container, { onHud, onGameOver } = {}) {
    this.container = container;
    this.onHud = onHud || (() => {});
    this.onGameOver = onGameOver || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101623);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.headMesh = null;
    this.bodyMeshes = [];
    this.foodMesh = null;

    this._buildBoard();

    this.snake = [];          // [{x,y}, ...] 头在 index 0
    this.dir = { x: 0, y: 1 };
    this.pendingDirs = [];    // 输入缓冲，防止一帧内两次转向导致自杀
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.interval = BASE_INTERVAL;
    this.tickTimer = 0;
    this.state = "idle";      // idle | running | paused | over

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    this.renderer.setAnimationLoop(this._loop);
  }

  /* ---------- 场景 ---------- */

  _quad(w, h, color) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color })
    );
  }

  _buildBoard() {
    const cy = ROWS / 2;
    const panel = this._quad(COLS + 0.5, ROWS + 0.5, 0x161f30);
    panel.position.set(0, cy, -0.2);
    this.scene.add(panel);

    const pts = [];
    for (let x = 0; x <= COLS; x++) pts.push(x - COLS / 2, 0, 0, x - COLS / 2, ROWS, 0);
    for (let y = 0; y <= ROWS; y++) pts.push(-COLS / 2, y, 0, COLS / 2, y, 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.scene.add(new THREE.LineSegments(geo,
      new THREE.LineBasicMaterial({ color: 0x22314c })));

    const t = 0.16;
    const borders = [
      [COLS + t * 2, t, 0, ROWS + t / 2],
      [COLS + t * 2, t, 0, -t / 2],
      [t, ROWS + t * 2, -COLS / 2 - t / 2, cy],
      [t, ROWS + t * 2, COLS / 2 + t / 2, cy],
    ];
    for (const [w, h, x, y] of borders) {
      const b = this._quad(w, h, 0x33507a);
      b.position.set(x, y, -0.1);
      this.scene.add(b);
    }

    const cellGeo = new THREE.PlaneGeometry(0.9, 0.9);
    this._cellGeo = cellGeo;
    this.foodMesh = new THREE.Mesh(cellGeo, new THREE.MeshBasicMaterial({ color: FOOD_COLOR }));
    this.foodMesh.visible = false;
    this.scene.add(this.foodMesh);
  }

  _bodyMesh(i) {
    if (i === 0) {
      if (!this.headMesh) {
        this.headMesh = new THREE.Mesh(this._cellGeo, new THREE.MeshBasicMaterial({ color: HEAD_COLOR }));
        this.scene.add(this.headMesh);
      }
      return this.headMesh;
    }
    while (this.bodyMeshes.length < i) {
      this.bodyMeshes.push(new THREE.Mesh(this._cellGeo, new THREE.MeshBasicMaterial({ color: BODY_COLOR })));
      this.scene.add(this.bodyMeshes[this.bodyMeshes.length - 1]);
    }
    return this.bodyMeshes[i - 1];
  }

  _worldPos(gx, gy) {
    return new THREE.Vector3(gx - COLS / 2 + 0.5, ROWS - 0.5 - gy, 0);
  }

  /* ---------- 流程 ---------- */

  start() {
    this.snake = [
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) - 1 },
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) - 2 },
    ];
    this.dir = { x: 0, y: 1 };
    this.pendingDirs = [];
    this.score = 0;
    this.interval = BASE_INTERVAL;
    this.tickTimer = 0;
    this._spawnFood();
    this._sync();
    this.state = "running";
    sfx.start();
    this.onHud({ score: this.score });
  }

  pause() {
    if (this.state === "running") this.state = "paused";
  }
  resume() {
    if (this.state === "paused") this.state = "running";
  }

  _spawnFood() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!this.snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    if (free.length === 0) return; // 占满全屏 = 胜利，按结束处理
    this.food = free[Math.floor(Math.random() * free.length)];
    this.foodMesh.visible = true;
    this.foodMesh.position.copy(this._worldPos(this.food.x, this.food.y));
  }

  /** 设置方向：忽略反向与同向，缓冲最多 2 个输入 */
  setDir(x, y) {
    if (this.state !== "running") return;
    const last = this.pendingDirs.length > 0
      ? this.pendingDirs[this.pendingDirs.length - 1]
      : this.dir;
    if ((x === last.x && y === last.y) || (x === -last.x && y === -last.y)) return;
    if (this.pendingDirs.length < 2) this.pendingDirs.push({ x, y });
  }

  /* ---------- 逻辑步进 ---------- */

  _tick() {
    if (this.pendingDirs.length > 0) this.dir = this.pendingDirs.shift();
    const head = this.snake[0];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    // 撞墙
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return this._die();
    // 撞自己（尾巴将移动，不算碰撞）
    const willEat = nx === this.food.x && ny === this.food.y;
    const body = willEat ? this.snake : this.snake.slice(0, -1);
    if (body.some((s) => s.x === nx && s.y === ny)) return this._die();

    this.snake.unshift({ x: nx, y: ny });
    if (willEat) {
      this.score += 10;
      this.interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - this.score / 200);
      sfx.clear();
      this._spawnFood();
      this.onHud({ score: this.score });
      if (this.snake.length >= COLS * ROWS) return this._die(true);
    } else {
      this.snake.pop();
    }
    this._sync();
  }

  _die(win = false) {
    this.state = "over";
    sfx.over();
    this.onGameOver(this.score, win);
  }

  _sync() {
    for (let i = 0; i < this.snake.length; i++) {
      this._bodyMesh(i).position.copy(this._worldPos(this.snake[i].x, this.snake[i].y));
    }
    // 隐藏多余的蛇身 mesh
    for (let i = this.snake.length - 1; i < this.bodyMeshes.length; i++) {
      this.bodyMeshes[i].visible = false;
    }
    for (let i = 0; i < Math.min(this.snake.length - 1, this.bodyMeshes.length); i++) {
      this.bodyMeshes[i].visible = true;
    }
    if (this.headMesh) this.headMesh.visible = this.snake.length > 0;
  }

  /* ---------- 主循环 ---------- */

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.state === "running") {
      this.tickTimer += dt;
      if (this.tickTimer >= this.interval) {
        this.tickTimer = 0;
        this._tick();
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
