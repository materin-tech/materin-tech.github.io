// 俄罗斯方块形状与颜色定义
// 每种方块用矩阵表示，旋转 = 转置 + 行反转（顺时针 90°）

export const COLS = 10;
export const ROWS = 20;

export const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

export const COLORS = {
  I: 0x26c6da, // 青
  O: 0xffca28, // 黄
  T: 0xab47bc, // 紫
  S: 0x66bb6a, // 绿
  Z: 0xef5350, // 红
  J: 0x42a5f5, // 蓝
  L: 0xff7043, // 橙
};

/** 矩阵顺时针旋转 90°，返回新矩阵（不修改原矩阵） */
export function rotateMatrix(m) {
  const n = m.length;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = m[r][c];
    }
  }
  return out;
}

const BAG = Object.keys(SHAPES);

/** 7-bag 随机器：每 7 块洗一次牌，保证分布均匀 */
export function createBag() {
  let queue = [];
  return () => {
    if (queue.length === 0) {
      queue = [...BAG];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
    }
    return queue.pop();
  };
}
