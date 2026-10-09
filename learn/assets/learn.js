/* AI 原生学习路线 · learn 引擎（无依赖，数据驱动）
   契约：materin-learn-<component>[__part][--variant]，状态 is-*。 */
(function () {
  'use strict';

  var app = document.getElementById('app');
  if (!app) return;

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function lang() {
    return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  }

  function t(obj) { return obj ? (obj[lang()] || obj.zh || '') : ''; }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* 模板注册表：每张动效卡片一个渲染函数，吃 day，吐 DOM */
  var TPL = {

    /* counter：切碎动画 + 数字滚动 */
    counter: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-counter');
      var chips = el('div', 'materin-learn-counter__chips');
      var count = el('div', 'materin-learn-counter__count');
      var num = el('div', 'materin-learn-counter__num', '0');
      var label = el('div', 'materin-learn-counter__label', lang() === 'en' ? 'tokens' : '个 token');
      var swap = el('div', 'materin-learn-counter__swap');
      var note = el('p', 'materin-learn-counter__note');

      var mode = 'zh';
      var chipNodes = [];

      function chipsFor(m) {
        var list = m === 'zh' ? a.tokensZh : a.tokensEn;
        chips.innerHTML = '';
        chipNodes = list.map(function (tok, i) {
          var chip = el('span', 'materin-learn-counter__chip' +
            (m === 'en' ? ' materin-learn-counter__chip--en' : ''), tok);
          chip.style.animationDelay = (i * 0.16) + 's';
          chips.appendChild(chip);
          return chip;
        });
        return list.length;
      }

      function rollTo(target) {
        var start = null, dur = 1400, from = 0;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          num.textContent = Math.round(from + (target - from) * eased);
          if (p < 1) requestAnimationFrame(step);
          else num.classList.add('is-done');
        }
        num.classList.remove('is-done');
        num.textContent = '0';
        requestAnimationFrame(step);
      }

      function show(m) {
        mode = m;
        var n = chipsFor(m);
        rollTo(n);
        note.textContent = lang() === 'en'
          ? (m === 'zh'
            ? 'Same idea, two languages — ' + a.counts.chars + ' characters either way, yet the token count differs.'
            : 'Characters stay ' + a.counts.chars + '; tokens move with the language.')
          : (m === 'zh'
            ? '同一句话 12 个字，中文 ' + a.counts.zh + ' 个 token，英文要 ' + a.counts.en + ' 个。'
            : '同一句话 12 字：中文 ' + a.counts.zh + ' token，英文 ' + a.counts.en + ' token。');
      }

      var bZh = el('button', null, lang() === 'en' ? 'Chinese' : '中文');
      var bEn = el('button', null, 'English');
      bZh.addEventListener('click', function () { bZh.classList.add('is-active'); bEn.classList.remove('is-active'); show('zh'); });
      bEn.addEventListener('click', function () { bEn.classList.add('is-active'); bZh.classList.remove('is-active'); show('en'); });

      bZh.classList.add('is-active');
      swap.appendChild(bZh); swap.appendChild(bEn);
      count.appendChild(num); count.appendChild(label);
      wrap.appendChild(chips); wrap.appendChild(count); wrap.appendChild(swap); wrap.appendChild(note);
      setTimeout(function () { show('zh'); }, 350);
      return wrap;
    },

    /* similarity：语义散点 + 余弦连线 + 相似度滚动 */
    similarity: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-sim');
      var field = el('div', 'materin-learn-sim__field');
      var readout = el('div', 'materin-learn-sim__readout');
      var pairLabel = el('div', 'materin-learn-sim__pair');
      var pairScore = el('div', 'materin-learn-sim__score', '0.00');
      var note = el('p', 'materin-learn-sim__note', t(a.note));

      function pos(p) { return { x: p.x, y: p.y }; }

      var dots = a.points.map(function (p) {
        var d = el('div', 'materin-learn-sim__dot', t({ zh: p.w, en: p.en }));
        d.style.left = p.x + '%';
        d.style.top = p.y + '%';
        d.style.animationDelay = (0.3 + Math.random() * 0.4) + 's';
        field.appendChild(d);
        return d;
      });

      var links = a.pairs.map(function (pr, i) {
        var pa = a.points.find(function (p) { return p.w === pr.a; }) || a.points[0];
        var pb = a.points.find(function (p) { return p.w === pr.b; }) || a.points[0];
        var line = el('div', 'materin-learn-sim__link');
        line.style.animationDelay = (0.9 + i * 0.9) + 's';
        line.__a = pa; line.__b = pb;
        field.appendChild(line);
        return { line: line, pr: pr };
      });

      /* 连线几何：布局完成后按像素计算长度与角度 */
      function layoutLinks() {
        var W = field.offsetWidth, H = field.offsetHeight;
        if (!W || !H) return false;
        links.forEach(function (L) {
          var ax = L.line.__a.x / 100 * W, ay = L.line.__a.y / 100 * H;
          var bx = L.line.__b.x / 100 * W, by = L.line.__b.y / 100 * H;
          var dx = bx - ax, dy = by - ay;
          var len = Math.sqrt(dx * dx + dy * dy);
          var ang = Math.atan2(dy, dx) * 180 / Math.PI;
          L.line.style.left = ax + 'px';
          L.line.style.top = ay + 'px';
          L.line.style.width = len + 'px';
          L.line.style.transform = 'rotate(' + ang + 'deg)';
        });
        return true;
      }
      requestAnimationFrame(function () { layoutLinks(); });
      window.addEventListener('resize', function () { layoutLinks(); });

      function linkVisible(tNow) {
        return links.map(function (L, i) {
          var start = 0.9 + i * 0.9, dur = 1.4;
          var on = tNow > start ? Math.min((tNow - start) / dur, 1) : 0;
          L.line.style.opacity = on;
          return on > 0.55 ? L.pr : null;
        }).filter(Boolean);
      }

      var t0 = null, done = false;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) / 1000;
        var vis = linkVisible(tNow);
        if (vis.length) {
          var cur = vis[vis.length - 1];
          pairLabel.textContent = cur.a + ' ↔ ' + cur.b;
          var start = 0, shown = 0;
          links.forEach(function (L) { if (L.pr === cur) start = 0.9 + links.indexOf(L) * 0.9; });
          shown = Math.min(Math.max((tNow - start - 0.55) / 0.5, 0), 1);
          pairScore.textContent = (cur.sim * shown).toFixed(2);
        }
        if (tNow < 5.5) requestAnimationFrame(step);
        else if (!done) {
          done = true;
          pairLabel.textContent = a.pairs[0].a + ' ↔ ' + a.pairs[0].b;
          pairScore.textContent = a.pairs[0].sim.toFixed(2);
          links[0].line.classList.add('is-best');
        }
      }
      requestAnimationFrame(step);

      wrap.appendChild(field);
      readout.appendChild(pairLabel); readout.appendChild(pairScore);
      wrap.appendChild(readout);
      wrap.appendChild(note);
      return wrap;
    },

    /* spectrum：温度旋钮 + softmax 概率谱 + 逐帧采样闪烁 */
    spectrum: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-spectrum');
      var dial = el('div', 'materin-learn-spectrum__dial');
      var phrase = el('div', 'materin-learn-spectrum__phrase');
      var bars = el('div', 'materin-learn-spectrum__bars');
      var note = el('p', 'materin-learn-spectrum__note', t(a.note));
      var temps = a.temperatures;
      var cur = null;
      var barNodes = [];

      a.candidates.forEach(function (c) {
        var row = el('div', 'materin-learn-spectrum__row');
        var word = el('span', 'materin-learn-spectrum__word', lang() === 'en' ? c.en : c.w);
        var track = el('div', 'materin-learn-spectrum__track');
        var bar = el('div', 'materin-learn-spectrum__bar');
        bar.style.width = '0%';
        var val = el('span', 'materin-learn-spectrum__val', '');
        track.appendChild(bar);
        row.appendChild(word); row.appendChild(track); row.appendChild(val);
        bars.appendChild(row);
        barNodes.push({ c: c, bar: bar, val: val, row: row });
      });

      function pickTemp() {
        /* 按温度权重循环：低温出现更久，高温尾部也轮到 */
        var idx = temps.indexOf(cur);
        var next = (idx + 1) % temps.length;
        return temps[next];
      }

      var rollTimer = null;
      function roll() {
        /* 采样闪烁：按当前概率随机点亮候选行 */
        var r = Math.random() * 100, acc = 0, hit = barNodes[0];
        for (var i = 0; i < barNodes.length; i++) {
          acc += cur.probs[i];
          if (r <= acc) { hit = barNodes[i]; break; }
        }
        barNodes.forEach(function (b) { b.row.classList.remove('is-hit'); });
        hit.row.classList.add('is-hit');
        phrase.textContent = (lang() === 'en' ? a.sentence.en.replace('___', '') : a.sentence.zh.replace('＿', '')) +
          (lang() === 'en' ? hit.c.en : hit.c.w);
      }

      function show(temp) {
        cur = temp;
        barNodes.forEach(function (b, i) {
          var p = temp.probs[i];
          b.bar.style.width = p + '%';
          b.val.textContent = p.toFixed(1) + '%';
        });
        roll();
        if (rollTimer) clearInterval(rollTimer);
        rollTimer = setInterval(roll, 1100);
      }

      temps.forEach(function (temp) {
        var btn = el('button', null, 'T=' + temp.t);
        btn.addEventListener('click', function () {
          dial.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-active'); });
          btn.classList.add('is-active');
          show(temp);
        });
        dial.appendChild(btn);
      });
      dial.children[0].classList.add('is-active');

      phrase.classList.add('is-head');
      wrap.appendChild(phrase);
      wrap.appendChild(bars);
      wrap.appendChild(dial);
      wrap.appendChild(note);
      setTimeout(function () { show(temps[0]); }, 350);
      return wrap;
    },

    /* windowfill：上下文窗口预算条——四类块按序入格，历史逐轮增长，超出预算的最旧块灰出截断 */
    windowfill: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-winfill');
      var grid = el('div', 'materin-learn-winfill__grid');
      var cutRow = el('div', 'materin-learn-winfill__cutrow');
      var readout = el('div', 'materin-learn-winfill__readout');
      var note = el('p', 'materin-learn-winfill__note', t(a.note));
      var turnLabel = el('div', 'materin-learn-winfill__turn');

      var budget = a.budget || 16;
      var NAMES = {
        sys: { zh: '系统提示', en: 'System' },
        doc: { zh: '贴进文档', en: 'Docs' },
        hist: { zh: '对话历史', en: 'History' },
        reply: { zh: '回复空间', en: 'Reply' }
      };

      var histCells = a.blocks.filter(function (b) { return b.k === 'hist'; })[0] || { n: 1 };
      var sysN = (a.blocks.filter(function (b) { return b.k === 'sys'; })[0] || { n: 0 }).n;
      var docN = (a.blocks.filter(function (b) { return b.k === 'doc'; })[0] || { n: 0 }).n;
      var repN = (a.blocks.filter(function (b) { return b.k === 'reply'; })[0] || { n: 0 }).n;
      var histRoom = budget - sysN - docN - repN;
      var turns = Math.max(2, Math.min(6, Math.floor(histRoom / histCells.n) + 3));

      function pushCells(k, count, dropped, delayBase) {
        for (var i = 0; i < count; i++) {
          var cell = el('div', 'materin-learn-winfill__cell materin-learn-winfill__cell--' + k +
            (dropped ? ' is-dropped' : ''));
          cell.style.animationDelay = (delayBase + i * 0.04) + 's';
          grid.appendChild(cell);
        }
        return count;
      }

      function build(turn) {
        grid.innerHTML = '';
        cutRow.innerHTML = '';
        var need = histCells.n * turn;
        var over = Math.max(need - histRoom, 0);
        var live = need - over;
        var d = 0;
        d += pushCells('sys', sysN, false, d);
        d += pushCells('doc', docN, false, d);
        d += pushCells('hist', live, false, d);     /* 窗口内还活着的历史 */
        d += pushCells('reply', repN, false, d);
        var free = budget - d;
        for (var f = 0; f < free; f++) {
          grid.appendChild(el('div', 'materin-learn-winfill__cell materin-learn-winfill__cell--free'));
        }
        /* 被截断的最旧历史：窗口之外的幽灵格 */
        for (var o = 0; o < over; o++) {
          cutRow.appendChild(el('div', 'materin-learn-winfill__cut-cell'));
        }
        cutRow.appendChild(el('span', 'materin-learn-winfill__cut-label',
          lang() === 'en' ? (over > 0 ? '← oldest ' + over + ' truncated' : '') : (over > 0 ? '← 最旧 ' + over + ' 格被截断' : '')));
        var used = budget - free;
        return { used: used, over: over };
      }

      var turn = 1;
      function show() {
        var r = build(turn);
        turnLabel.textContent = '';
        turnLabel.appendChild(el('strong', 'materin-learn-winfill__turn-no',
          (lang() === 'en' ? 'Turn ' : '第 ') + turn + (lang() === 'en' ? '' : ' 轮')));
        turnLabel.appendChild(el('span', null,
          lang() === 'en'
            ? '  ' + r.used + '/' + budget + ' in window'
            : '  窗口内 ' + r.used + '/' + budget));
        turn = turn >= turns ? 1 : turn + 1;
      }

      var nameRow = el('div', 'materin-learn-winfill__legend');
      ['sys', 'doc', 'hist', 'reply'].forEach(function (k) {
        nameRow.appendChild(el('span', 'materin-learn-winfill__legend-item materin-learn-winfill__legend-item--' + k, t(NAMES[k])));
      });

      readout.appendChild(turnLabel);
      wrap.appendChild(nameRow);
      wrap.appendChild(grid);
      wrap.appendChild(cutRow);
      wrap.appendChild(readout);
      wrap.appendChild(note);
      setTimeout(show, 350);
      setInterval(show, 2200);
      return wrap;
    },

    /* descent：损失曲线下坡——小球沿曲线滚动、loss 数字同步下降，整循环自动重播 */
    descent: function (day) {
      var a = day.anim;
      var NS = 'http://www.w3.org/2000/svg';
      var wrap = el('div', 'materin-learn-descent');
      var field = el('div', 'materin-learn-descent__field');
      var plot = document.createElementNS(NS, 'svg');
      plot.setAttribute('viewBox', '0 0 100 100');
      plot.setAttribute('preserveAspectRatio', 'none');
      plot.classList.add('materin-learn-descent__plot');

      function line(cls, x1, y1, x2, y2) {
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
        ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
        ln.classList.add(cls);
        plot.appendChild(ln);
      }
      line('materin-learn-descent__axis', 4, 8, 4, 95);
      line('materin-learn-descent__axis', 4, 95, 97, 95);

      var curve = document.createElementNS(NS, 'polyline');
      curve.setAttribute('points', a.points.map(function (p) { return p.x + ',' + p.y; }).join(' '));
      curve.classList.add('materin-learn-descent__curve');
      plot.appendChild(curve);
      field.appendChild(plot);

      var ball = el('div', 'materin-learn-descent__ball');
      field.appendChild(ball);

      var readout = el('div', 'materin-learn-descent__readout');
      var epoch = el('span', 'materin-learn-descent__epoch');
      var lossTag = el('span', 'materin-learn-descent__loss-tag', lang() === 'en' ? 'loss' : '损失');
      var loss = el('span', 'materin-learn-descent__loss', '10.8');

      function lerp(p, q, f) { return p + (q - p) * f; }
      function posAt(t01) {
        var pts = a.points;
        var x = pts[0].x + (pts[pts.length - 1].x - pts[0].x) * t01;
        var i = 0;
        while (i < pts.length - 2 && pts[i + 1].x < x) i++;
        var f = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
        return { x: x, y: lerp(pts[i].y, pts[i + 1].y, f) };
      }
      function lossAt(t01) {
        var s = a.samples;
        var idx = t01 * (s.length - 1);
        var i = Math.min(Math.floor(idx), s.length - 2);
        return lerp(s[i].l, s[i + 1].l, idx - i);
      }

      var t0 = null, DUR = 6000, HOLD = 1100;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = ts - t0;
        if (tNow > DUR + HOLD) { t0 = ts; tNow = 0; }
        var t01 = Math.min(tNow / DUR, 1);
        var p = posAt(t01);
        ball.style.left = p.x + '%';
        ball.style.top = p.y + '%';
        loss.textContent = lossAt(t01).toFixed(1);
        epoch.textContent = (lang() === 'en' ? 'step ' : '第 ') +
          Math.round(t01 * (a.samples.length - 1)) + (lang() === 'en' ? '' : ' 步');
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(field);
      readout.appendChild(epoch);
      readout.appendChild(lossTag);
      readout.appendChild(loss);
      wrap.appendChild(readout);
      wrap.appendChild(el('p', 'materin-learn-descent__note', t(a.note)));
      return wrap;
    },

    /* attn：注意力权重分配——查询 token 高亮，全句评分条按 softmax 权重依次充满，循环重播 */
    attn: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-attn');
      var tokensRow = el('div', 'materin-learn-attn__tokens');
      var rowsBox = el('div', 'materin-learn-attn__rows');
      var readout = el('div', 'materin-learn-attn__readout');
      var qTag = el('span', 'materin-learn-attn__q');
      var score = el('span', 'materin-learn-attn__score', '0%');
      var note = el('p', 'materin-learn-attn__note', t(a.note));

      var isEn = lang() === 'en';
      var names = isEn ? a.tokensEn : a.tokens;
      var qi = a.qi || 0;
      var maxW = Math.max.apply(null, a.weights);

      var bars = names.map(function (name, i) {
        var token = el('span', 'materin-learn-attn__token' + (i === qi ? ' materin-learn-attn__token--q' : ''), name);
        tokensRow.appendChild(token);
        var col = el('div', 'materin-learn-attn__col');
        col.appendChild(el('span', 'materin-learn-attn__token' + (i === qi ? ' materin-learn-attn__token--q' : ''), name));
        var track = el('div', 'materin-learn-attn__track');
        var bar = el('div', 'materin-learn-attn__bar');
        bar.style.width = '0%';
        track.appendChild(bar);
        col.appendChild(track);
        var val = el('span', 'materin-learn-attn__val', '');
        col.appendChild(val);
        rowsBox.appendChild(col);
        return { token: token, col: col, bar: bar, val: val, w: a.weights[i] };
      });

      var top = bars.reduce(function (m, b) { return b.w > m.w ? b : m; }, bars[0]);
      qTag.textContent = (isEn ? 'query ' : '查询 ') + names[qi];

      var t0 = null, DUR = 5000, HOLD = 1300;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = ts - t0;
        if (tNow > DUR + HOLD) { t0 = ts; tNow = 0; }
        var t01 = Math.min(tNow / DUR, 1);
        bars.forEach(function (b, i) {
          /* 每根条在自己的时间片内充满；JSON 不再读旧字段，权重来自 weights */
          var start = i * 0.11, dur = 0.34;
          var f = Math.min(Math.max((t01 - start) / dur, 0), 1);
          var eased = 1 - Math.pow(1 - f, 3);
          b.bar.style.width = (b.w * eased) + '%';
          b.val.textContent = f > 0 ? (b.w * eased).toFixed(1) + '%' : '';
        });
        if (t01 >= 1) {
          bars.forEach(function (b) { b.bar.classList.toggle('is-top', b === top); });
          score.textContent = (isEn ? top.w.toFixed(1) + '%' : names[qi] + ' ← ' + top.token.textContent + ' ' + top.w.toFixed(1) + '%');
        } else {
          bars.forEach(function (b) { b.bar.classList.remove('is-top'); });
          score.textContent = Math.min(99.9, a.weights.reduce(function (s, w) { return s; }, 0) + t01 * maxW).toFixed(1) + '%';
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(tokensRow);
      wrap.appendChild(rowsBox);
      readout.appendChild(qTag);
      readout.appendChild(score);
      wrap.appendChild(readout);
      wrap.appendChild(note);
      return wrap;
    },

    /* flow：预训练流水线——语料格逐级收缩（清洗→切 token→训练→基座），循环重播。
       入场只动 transform，不碰 opacity（导出/采样不会停在透明第一帧）。 */
    flow: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-flow');
      var rowsBox = el('div', 'materin-learn-flow__rows');
      var note = el('p', 'materin-learn-flow__note', t(a.note));
      var DUR = 6400, HOLD = 1500;
      var phases = [];

      a.steps.forEach(function (st, i) {
        var row = el('div', 'materin-learn-flow__row materin-learn-flow__row--' + st.k);
        row.style.setProperty('--flow-n', String(st.n));
        row.appendChild(el('span', 'materin-learn-flow__tag', t({ zh: st.zh, en: st.en })));
        var cells = el('div', 'materin-learn-flow__cells');
        for (var c = 0; c < st.n; c++) {
          var cell = el('span', 'materin-learn-flow__cell');
          cell.style.animationDelay = (0.2 + i * 0.9 + c * 0.05) + 's';
          cells.appendChild(cell);
        }
        row.appendChild(cells);
        row.appendChild(el('span', 'materin-learn-flow__num', t({ zh: st.numZh, en: st.numEn })));
        rowsBox.appendChild(row);
        phases.push(row);
      });

      var t0 = null;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = ts - t0;
        if (tNow > DUR + HOLD) { t0 = ts; tNow = 0; }
        var t01 = Math.min(tNow / DUR, 1);
        /* 每级在其时间片内从满宽收缩到 --flow-n/12 的份额（CSS 端按 --flow-p 插值宽度） */
        phases.forEach(function (row, i) {
          var start = 0.14 + i * 0.22, dur = 0.5;
          var f = Math.min(Math.max((t01 - start) / dur, 0), 1);
          var eased = 1 - Math.pow(1 - f, 3);
          row.style.setProperty('--flow-p', eased.toFixed(3));
          row.classList.toggle('is-done', f >= 1);
        });
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(rowsBox);
      wrap.appendChild(note);
      return wrap;
    },

    /* duel：偏好对决——同一问题的两个回答左右对决，人类点亮胜者，胜率爬升 */
    duel: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-duel');
      var prompt = el('div', 'materin-learn-duel__prompt', t(a.prompt));
      var roundsBox = el('div', 'materin-learn-duel__rounds');
      var meter = el('div', 'materin-learn-duel__meter');
      var meterTrack = el('div', 'materin-learn-duel__track');
      var meterBar = el('div', 'materin-learn-duel__bar');
      var meterNum = el('span', 'materin-learn-duel__num', '50%');
      var meterLabel = el('span', 'materin-learn-duel__meter-label',
        lang() === 'en' ? 'preference win rate' : '偏好胜率');
      var note = el('p', 'materin-learn-duel__note', t(a.note));

      meterTrack.appendChild(meterBar);
      meter.appendChild(meterNum);
      meter.appendChild(meterTrack);
      meter.appendChild(meterLabel);
      meterBar.style.width = '50%';

      a.rounds.forEach(function (r, i) {
        var round = el('div', 'materin-learn-duel__round');
        round.appendChild(el('span', 'materin-learn-duel__round-no', '#' + (i + 1)));
        ['a', 'b'].forEach(function (side, si) {
          var card = el('div', 'materin-learn-duel__card materin-learn-duel__card--' + side, t(r[side]));
          card.style.animationDelay = (0.3 + i * 2.4 + si * 0.3) + 's';
          round.appendChild(card);
        });
        roundsBox.appendChild(round);
      });

      var t0 = null;
      var ROUND = 2400, HOLD = 700, TOTAL = a.rounds.length * ROUND + HOLD;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % TOTAL;
        /* 每轮在其时间片后 40% 处点亮胜者 */
        a.rounds.forEach(function (r, i) {
          var round = roundsBox.children[i];
          var f = tNow > i * ROUND + ROUND * 0.4;
          round.classList.toggle('is-picked', f);
        });
        /* 胜率按轮数阶梯爬升 */
        var stage = 0;
        a.rounds.forEach(function (_, i) {
          if (tNow > i * ROUND + ROUND * 0.4) stage = i + 1;
        });
        var wr = a.winrates[Math.min(stage, a.winrates.length - 1)];
        meterBar.style.width = wr + '%';
        meterNum.textContent = wr + '%';
        meter.classList.toggle('is-climbed', stage >= a.rounds.length);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(prompt);
      wrap.appendChild(roundsBox);
      wrap.appendChild(meter);
      wrap.appendChild(note);
      return wrap;
    },

    /* fabricate：同一台打分机面对三类问题的不同结局——事实编造 / 事实答对 / 创作无妨 */
    fabricate: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-fab');
      var qline = el('div', 'materin-learn-fab__question', t(a.question));
      var roundsBox = el('div', 'materin-learn-fab__rounds');
      var note = el('p', 'materin-learn-fab__note', t(a.note));

      a.rounds.forEach(function (r, i) {
        var round = el('div', 'materin-learn-fab__round materin-learn-fab__round--' + r.verdict);
        round.appendChild(el('div', 'materin-learn-fab__q', t(r.q)));
        var row = el('div', 'materin-learn-fab__row');
        row.appendChild(el('span', 'materin-learn-fab__mark',
          lang() === 'en' ? r.verdictEn : r.verdictZh));
        var card = el('div', 'materin-learn-fab__card', t(r.a));
        card.style.animationDelay = (0.3 + i * 2.0) + 's';
        row.appendChild(card);
        round.appendChild(row);
        round.appendChild(el('div', 'materin-learn-fab__label', t(r.label)));
        roundsBox.appendChild(round);
      });

      var t0 = null;
      var STEP = 2000, HOLD = 800, TOTAL = a.rounds.length * STEP + HOLD;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % TOTAL;
        a.rounds.forEach(function (_, i) {
          var round = roundsBox.children[i];
          round.classList.toggle('is-revealed', tNow > i * STEP + STEP * 0.35);
        });
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(qline);
      wrap.appendChild(roundsBox);
      wrap.appendChild(note);
      return wrap;
    },

    /* lora：冻结权重墙 + 挂载的 LoRA 小矩阵逐轮点亮——梯度只流向批注层，循环重播 */
    lora: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-lora');
      var wall = el('div', 'materin-learn-lora__wall');
      var patch = el('div', 'materin-learn-lora__patch');
      var readout = el('div', 'materin-learn-lora__readout');
      var pct = el('span', 'materin-learn-lora__pct', '0%');
      var pctLabel = el('span', 'materin-learn-lora__pct-label',
        lang() === 'en' ? ' trainable' : ' 可训练');
      var patchTag = el('div', 'materin-learn-lora__patch-tag',
        lang() === 'en' ? 'LoRA B·A (trainable)' : 'LoRA B·A（参与训练）');
      var wallTag = el('div', 'materin-learn-lora__wall-tag',
        lang() === 'en' ? 'pretrained weights W (frozen)' : '预训练权重 W（冻结）');
      var note = el('p', 'materin-learn-lora__note', t(a.note));

      /* 冻结墙：每格是确定性排布的深色块，入场用 transform，不用 opacity */
      a.blocks.forEach(function (b) {
        for (var i = 0; i < b.n; i++) {
          var cell = el('div', 'materin-learn-lora__cell materin-learn-lora__cell--' + b.k);
          cell.style.animationDelay = (0.2 + i * 0.06) + 's';
          wall.appendChild(cell);
        }
      });

      /* LoRA 补丁：瘦矩阵 A → B 的两列小块，逐轮点亮 */
      var laneA = el('div', 'materin-learn-lora__lane');
      var laneB = el('div', 'materin-learn-lora__lane');
      var LANE_N = 4;
      for (var i = 0; i < LANE_N; i++) {
        var ca = el('div', 'materin-learn-lora__mini materin-learn-lora__mini--a');
        var cb = el('div', 'materin-learn-lora__mini materin-learn-lora__mini--b');
        ca.style.animationDelay = (0.8 + i * 0.12) + 's';
        cb.style.animationDelay = (1.4 + i * 0.12) + 's';
        laneA.appendChild(ca);
        laneB.appendChild(cb);
      }
      patch.appendChild(laneA);
      patch.appendChild(laneB);

      var t0 = null, DUR = 4800, HOLD = 1400, CYCLE = DUR + HOLD;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % CYCLE;
        var t01 = Math.min(tNow / DUR, 1);
        var eased = 1 - Math.pow(1 - t01, 3);
        pct.textContent = (a.pct * eased).toFixed(1) + '%';
        patch.classList.toggle('is-live', tNow > DUR);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      readout.appendChild(pct);
      readout.appendChild(pctLabel);
      wrap.appendChild(wallTag);
      wrap.appendChild(wall);
      wrap.appendChild(patchTag);
      wrap.appendChild(patch);
      wrap.appendChild(readout);
      wrap.appendChild(note);
      return wrap;
    },

    /* quant：同一组权重在三种精度下的存储——格宽按字节数收缩，GB 数字同步滚动，循环重播。
       入场只动 transform，不碰 opacity（导出/采样不会停在透明第一帧）。 */
    quant: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-quant');
      var rowsBox = el('div', 'materin-learn-quant__rows');
      var readout = el('div', 'materin-learn-quant__readout');
      var gbNum = el('span', 'materin-learn-quant__gb', '0');
      var gbLabel = el('span', 'materin-learn-quant__gb-label',
        lang() === 'en' ? 'GB to load' : 'GB 要装进显存');
      var note = el('p', 'materin-learn-quant__note', t(a.note));

      var isEn = lang() === 'en';
      var rows = a.levels.map(function (lv, i) {
        var row = el('div', 'materin-learn-quant__row materin-learn-quant__row--' + lv.k);
        row.appendChild(el('span', 'materin-learn-quant__tag', isEn ? lv.tagEn : lv.tagZh));
        var cells = el('div', 'materin-learn-quant__cells');
        for (var c = 0; c < a.weights; c++) {
          var cell = el('span', 'materin-learn-quant__cell');
          cell.style.animationDelay = (0.2 + i * 0.55 + c * 0.06) + 's';
          cells.appendChild(cell);
        }
        cells.style.setProperty('--quant-bytes', String(lv.cellBytes));
        row.appendChild(cells);
        row.appendChild(el('span', 'materin-learn-quant__gb-tag', lv.gb + ' GB'));
        var q = el('span', 'materin-learn-quant__q', '');
        q.textContent = lv.q >= 100 ? '100%' : '≈' + lv.q + '%';
        row.appendChild(q);
        rowsBox.appendChild(row);
        return { row: row, lv: lv };
      });

      var t0 = null;
      var DUR = 5200, HOLD = 1500, CYCLE = DUR + HOLD;
      var MAXGB = a.levels[a.levels.length - 1].gb;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % CYCLE;
        var t01 = Math.min(tNow / DUR, 1);
        rows.forEach(function (r, i) {
          var start = 0.1 + i * 0.3, dur = 0.32;
          var f = Math.min(Math.max((t01 - start) / dur, 0), 1);
          var eased = 1 - Math.pow(1 - f, 3);
          r.row.classList.toggle('is-done', f >= 1);
          /* 数字滚动跟随最后一行（INT4）的完成度：140GB → 35GB */
          if (i === rows.length - 1) {
            var v = Math.round(a.levels[0].gb + (MAXGB - a.levels[0].gb) * eased);
            gbNum.textContent = String(v);
            gbNum.classList.toggle('is-done', f >= 1);
          }
        });
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      readout.appendChild(gbNum);
      readout.appendChild(gbLabel);
      wrap.appendChild(rowsBox);
      wrap.appendChild(readout);
      wrap.appendChild(note);
      return wrap;
    },

    /* distill：老师的软分布 → 学生的软分布（第 12 天）。三根候选条在老师/学生
       两个标尺间过渡，第二条（runner-up）是暗知识的主角，循环重播。
       入场只动 transform，不依赖 opacity（导出/采样不会停在透明第一帧）。 */
    distill: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-distill');
      var qline = el('div', 'materin-learn-distill__q', t(a.sentence));
      var panel = el('div', 'materin-learn-distill__panel');
      var barsBox = el('div', 'materin-learn-distill__bars');
      var readout = el('div', 'materin-learn-distill__readout');
      var who = el('span', 'materin-learn-distill__who',
        lang() === 'en' ? 'teacher (soft labels)' : '老师（软标签）');
      var note = el('p', 'materin-learn-distill__note', t(a.note));

      var rows = a.candidates.map(function (w, i) {
        var row = el('div', 'materin-learn-distill__row' +
          (i === 1 ? ' materin-learn-distill__row--dark' : ''));
        row.appendChild(el('span', 'materin-learn-distill__word', w));
        var track = el('div', 'materin-learn-distill__track');
        var bar = el('div', 'materin-learn-distill__bar');
        bar.style.animationDelay = (0.2 + i * 0.16) + 's';
        track.appendChild(bar);
        row.appendChild(track);
        var num = el('span', 'materin-learn-distill__num', '0%');
        row.appendChild(num);
        barsBox.appendChild(row);
        return { bar: bar, num: num, row: row };
      });

      var t0 = null;
      var DUR = 5200, HOLD = 1600, CYCLE = DUR + HOLD;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % CYCLE;
        var t01 = Math.min(tNow / DUR, 1);
        /* 前半程落在老师分布，后半程滑向学生分布；p=0→1 是老师→学生的进度 */
        var p = t01 < 0.5 ? Math.min(t01 / 0.5, 1) : 1;
        var eased = 1 - Math.pow(1 - p, 3);
        var isTeacher = t01 < 0.5;
        rows.forEach(function (r, i) {
          var from = a.teacher[i], to = a.student[i];
          var v = from + (to - from) * eased;
          r.bar.style.setProperty('--distill-w', (v / 100 * 100) + '%');
          r.bar.style.width = v + '%';
          r.num.textContent = Math.round(v) + '%';
          r.row.classList.toggle('is-teacher', isTeacher);
        });
        who.textContent = isTeacher
          ? (lang() === 'en' ? 'teacher (soft labels)' : '老师（软标签）')
          : (lang() === 'en' ? 'student (learning the table)' : '学生（学这张表）');
        wrap.classList.toggle('is-student', !isTeacher);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      panel.appendChild(barsBox);
      panel.appendChild(readout);
      readout.appendChild(who);
      wrap.appendChild(qline);
      wrap.appendChild(panel);
      wrap.appendChild(note);
      return wrap;
    },

    /* kvcache：预填充一次算好提示词 K/V（橙格齐落），之后逐词生成每步只追加 1 格（绿）；
       右侧警示数同时滚动展示「不缓存则同一步要重算的格数」——显存换时间的交易可视化。
       入场只动 transform，不碰 opacity（导出/采样不会停在透明第一帧）。 */
    kvcache: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-kv');
      var promptTag = el('div', 'materin-learn-kv__tag',
        lang() === 'en' ? 'prompt K/V (prefill, once)' : '提示词 K/V（预填充，一次算好）');
      var promptRow = el('div', 'materin-learn-kv__row materin-learn-kv__row--prompt');
      var genTag = el('div', 'materin-learn-kv__tag',
        lang() === 'en' ? 'generated K/V (+1 per token)' : '生成 K/V（每词追加 1 格）');
      var genRow = el('div', 'materin-learn-kv__row materin-learn-kv__row--gen');
      var readout = el('div', 'materin-learn-kv__readout');
      var stepLabel = el('span', 'materin-learn-kv__step', '');
      var cached = el('span', 'materin-learn-kv__cached', '0');
      var cachedLabel = el('span', 'materin-learn-kv__cached-label',
        lang() === 'en' ? 'cached K/V slots' : '格 K/V 已缓存');
      var redo = el('div', 'materin-learn-kv__redo');
      var redoNum = el('span', 'materin-learn-kv__redo-num', '0');
      var redoLabel = el('span', 'materin-learn-kv__redo-label',
        lang() === 'en' ? 'would recompute (no cache)' : '格要重算（若无缓存）');
      var note = el('p', 'materin-learn-kv__note', t(a.note));

      var promptN = a.promptN || 12;
      var genN = a.genN || 6;

      for (var i = 0; i < promptN; i++) {
        var cell = el('div', 'materin-learn-kv__cell materin-learn-kv__cell--prompt');
        cell.style.animationDelay = (0.2 + i * 0.09) + 's';
        promptRow.appendChild(cell);
      }
      var genCells = [];
      for (var g = 0; g < genN; g++) {
        var gcell = el('div', 'materin-learn-kv__cell materin-learn-kv__cell--gen');
        gcell.style.animationDelay = '0s';
        genRow.appendChild(gcell);
        genCells.push(gcell);
      }

      var t0 = null;
      var PREFILL = 1500, STEP = 620, HOLD = 1500;
      var CYCLE = PREFILL + genN * STEP + HOLD;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = (ts - t0) % CYCLE;
        var stepIdx = -1;
        if (tNow < PREFILL) {
          /* 预填充期：提示词整行落位，重算警示从 promptN 爬到 promptN */
          var f = Math.min(tNow / PREFILL, 1);
          promptRow.style.setProperty('--kv-p', f.toFixed(3));
          cached.textContent = String(Math.round(promptN * f));
          redoNum.textContent = String(Math.round(promptN * f));
          stepLabel.textContent = lang() === 'en'
            ? 'prefill — building the cache'
            : '预填充 — 一次建好缓存';
          redo.classList.remove('is-calm');
        } else {
          stepIdx = Math.min(Math.floor((tNow - PREFILL) / STEP), genN - 1);
          var done = stepIdx + 1;
          genCells.forEach(function (c, k) {
            c.classList.toggle('is-in', k < done);
          });
          var held = promptN + done;
          cached.textContent = String(held);
          /* 不加缓存：这一步要为全部历史重算 K/V（held 格），缓存下只算 1 格 */
          redoNum.textContent = String(held);
          stepLabel.textContent = lang() === 'en'
            ? 'generating — +' + done + ' slot, reuses ' + (held - 1)
            : '生成中 — 新增 ' + done + ' 格，复用其余 ' + (held - 1) + ' 格';
          redo.classList.add('is-calm');
        }
        redoNum.classList.toggle('is-hot', stepIdx >= 0);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      readout.appendChild(stepLabel);
      readout.appendChild(cached);
      readout.appendChild(cachedLabel);
      redo.appendChild(redoNum);
      redo.appendChild(redoLabel);
      wrap.appendChild(promptTag);
      wrap.appendChild(promptRow);
      wrap.appendChild(genTag);
      wrap.appendChild(genRow);
      wrap.appendChild(readout);
      wrap.appendChild(redo);
      wrap.appendChild(note);
      return wrap;
    },

    /* atlas：概念地图（第 15 天两周总结）——三根主线按带状布局排站，先落站、
       再按主线顺序点亮边，最后亮跨线桥；循环重播。边几何与 sim 同法：布局后按像素算。 */
    atlas: function (day) {
      var a = day.anim;
      var wrap = el('div', 'materin-learn-atlas');
      var field = el('div', 'materin-learn-atlas__field');
      var note = el('p', 'materin-learn-atlas__note', t(a.note));

      a.clusters.forEach(function (c) {
        field.appendChild(el('div', 'materin-learn-atlas__band materin-learn-atlas__band--' + c.k));
      });
      var legend = el('div', 'materin-learn-atlas__legend');
      a.clusters.forEach(function (c) {
        var item = el('span', 'materin-learn-atlas__legend-item materin-learn-atlas__legend-item--' + c.k);
        item.appendChild(el('span', 'materin-learn-atlas__legend-dot'));
        item.appendChild(el('span', null, t({ zh: c.zh, en: c.en })));
        legend.appendChild(item);
      });
      var bridgeItem = el('span', 'materin-learn-atlas__legend-item materin-learn-atlas__legend-item--bridge');
      bridgeItem.appendChild(el('span', 'materin-learn-atlas__legend-dot'));
      bridgeItem.appendChild(el('span', null, lang() === 'en' ? 'cross-line bridge' : '跨线桥'));
      legend.appendChild(bridgeItem);

      var byD = {};
      a.nodes.forEach(function (nd) {
        var node = el('div', 'materin-learn-atlas__node materin-learn-atlas__node--' + nd.k);
        node.style.left = nd.x + '%';
        node.style.top = nd.y + '%';
        node.style.animationDelay = (0.3 + nd.x * 0.012) + 's';
        node.appendChild(el('span', 'materin-learn-atlas__node-d', 'D' + nd.d));
        node.appendChild(el('span', 'materin-learn-atlas__node-name', t({ zh: nd.zh, en: nd.en })));
        field.appendChild(node);
        byD[nd.d] = nd;
      });

      var lineEdges = a.edges.filter(function (e) { return e.k !== 'bridge'; });
      var bridgeEdges = a.edges.filter(function (e) { return e.k === 'bridge'; });
      var links = a.edges.map(function (e, i) {
        var pa = byD[e.a], pb = byD[e.b];
        var bridge = e.k === 'bridge';
        var line = el('div', 'materin-learn-atlas__edge' + (bridge ? ' materin-learn-atlas__edge--bridge' : ''));
        line.__pa = pa; line.__pb = pb;
        /* 主线边按顺序接力点亮；桥在主线走完后亮 */
        line.__start = bridge ? 0.8 + lineEdges.length * 0.35 + bridgeEdges.indexOf(e) * 0.7
                              : 1.2 + i * 0.35;
        field.appendChild(line);
        return line;
      });

      function layout() {
        var W = field.offsetWidth, H = field.offsetHeight;
        if (!W || !H) return false;
        links.forEach(function (line) {
          var ax = line.__pa.x / 100 * W, ay = line.__pa.y / 100 * H;
          var bx = line.__pb.x / 100 * W, by = line.__pb.y / 100 * H;
          var dx = bx - ax, dy = by - ay;
          line.style.left = ax + 'px';
          line.style.top = ay + 'px';
          line.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
          line.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
        });
        return true;
      }
      requestAnimationFrame(function () { layout(); });
      window.addEventListener('resize', layout);

      var t0 = null;
      var CYCLE = 11;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var tNow = ((ts - t0) / 1000) % CYCLE;
        links.forEach(function (line) {
          var f = Math.min(Math.max((tNow - line.__start) / 0.8, 0), 1);
          line.style.opacity = String(f);
          line.classList.toggle('is-lit', f >= 1);
        });
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      wrap.appendChild(field);
      wrap.appendChild(legend);
      wrap.appendChild(note);
      return wrap;
    }
  };

  function renderDay(n) {
    var day = (window.LEARN && window.LEARN.days) ? window.LEARN.days.find(function (d) { return d.n === n; }) : null;
    if (!day) {
      app.appendChild(el('p', 'materin-learn-dayhead__sub', lang() === 'en' ? 'This day is not published yet.' : '这一天还没有发布。'));
      return;
    }

    var head = el('header', 'materin-learn-dayhead');
    var meta = el('div', 'materin-learn-dayhead__meta');
    meta.appendChild(el('span', 'materin-learn-pill', (lang() === 'en' ? 'Day ' : '第 ') + day.n + (lang() === 'en' ? '' : ' 天')));
    var stage = window.LEARN.meta.stages.find(function (s) { return s.id === day.stage; });
    if (stage) meta.appendChild(el('span', 'materin-learn-pill materin-learn-pill--stage', t(stage.zh ? { zh: stage.zh, en: stage.en } : stage)));
    head.appendChild(meta);
    head.appendChild(el('h1', 'materin-learn-dayhead__title', t(day.title)));
    head.appendChild(el('p', 'materin-learn-dayhead__sub', t(day.subtitle)));
    app.appendChild(head);

    var sec = el('section', 'materin-learn-stage');
    sec.setAttribute('aria-label', t(day.title));
    sec.appendChild(el('p', 'materin-learn-stage__hook', t(day.anim.hook)));
    var render = TPL[day.anim.tpl] || TPL.counter;
    sec.appendChild(render(day));
    app.appendChild(sec);

    var secs = el('div', 'materin-learn-sections');
    day.sections.forEach(function (s) {
      var box = el('article', 'materin-learn-section');
      box.appendChild(el('h2', 'materin-learn-section__h', t(s.h)));
      box.appendChild(el('p', 'materin-learn-section__p', t(s.p)));
      if (s.deep) box.appendChild(el('p', 'materin-learn-section__deep', t(s.deep)));
      ['example', 'misconception'].forEach(function (k) {
        if (s[k]) {
          var sub = el('aside', 'materin-learn-callout materin-learn-callout--' + k);
          sub.appendChild(el('h3', 'materin-learn-callout__h', t(s[k].h)));
          sub.appendChild(el('p', 'materin-learn-callout__p', t(s[k].p)));
          box.appendChild(sub);
        }
      });
      secs.appendChild(box);
    });
    app.appendChild(secs);

    var act = el('section', 'materin-learn-action');
    act.appendChild(el('h2', 'materin-learn-action__h', t(day.action.h)));
    act.appendChild(el('p', 'materin-learn-action__p', t(day.action.p)));
    app.appendChild(act);

    var take = el('section', 'materin-learn-takeaway');
    take.appendChild(el('h2', 'materin-learn-takeaway__h', lang() === 'en' ? 'Takeaway' : '一句话沉淀'));
    take.appendChild(el('p', 'materin-learn-takeaway__p', t(day.takeaway)));
    app.appendChild(take);

    var total = window.LEARN.meta.total;
    var pager = document.getElementById('pager');
    if (pager) {
      var prev = document.getElementById('pager-prev');
      var next = document.getElementById('pager-next');
      if (n > 1) { prev.href = 'day.html?d=' + (n - 1); prev.removeAttribute('aria-disabled'); }
      else prev.setAttribute('aria-disabled', 'true');
      var published = window.LEARN.days.map(function (d) { return d.n; });
      var nextN = published.find(function (x) { return x > n; });
      if (nextN) { next.href = 'day.html?d=' + nextN; next.removeAttribute('aria-disabled'); }
      else {
        next.href = 'day.html?d=' + (n + 1 <= total ? n + 1 : n);
        next.setAttribute('aria-disabled', 'true');
      }
      pager.hidden = false;
    }
  }

  function renderHome() {
    var meta = window.LEARN.meta;
    var days = window.LEARN.days;
    var todayN = days.length ? Math.max.apply(null, days.map(function (d) { return d.n; })) : 0;

    var head = el('header', 'materin-learn-dayhead');
    head.appendChild(el('h1', 'materin-learn-dayhead__title', lang() === 'en' ? 'AI-Native Learning Roadmap' : 'AI 原生学习路线'));
    head.appendChild(el('p', 'materin-learn-dayhead__sub', lang() === 'en'
      ? 'Foundations, then agents, then a reshaped way of thinking — ' + meta.total + ' days, one page a day.'
      : '从关键基础到 Agent，再到认知重塑——' + meta.total + ' 天，每天一页。'));

    /* 总进度：已完成 X/168 + 进度条 + 今日卡 */
    var prog = el('div', 'materin-learn-progress');
    var label = el('div', 'materin-learn-progress__label');
    label.appendChild(el('span', null, (lang() === 'en' ? 'Progress ' : '进度 ')));
    label.appendChild(el('strong', 'materin-learn-progress__num', todayN + ' / ' + meta.total));
    prog.appendChild(label);
    var track = el('div', 'materin-learn-progress__track');
    var bar = el('div', 'materin-learn-progress__bar');
    bar.style.width = Math.min(100, todayN / meta.total * 100) + '%';
    track.appendChild(bar);
    prog.appendChild(track);
    head.appendChild(prog);

    /* 今日卡：跳当天 */
    var today = days.find(function (d) { return d.n === todayN; });
    if (today) {
      var card = el('a', 'materin-learn-today');
      card.href = 'day.html?d=' + today.n;
      card.appendChild(el('span', 'materin-learn-today__kicker', lang() === 'en' ? 'Latest' : '最新一课 · 第 ' + today.n + ' 天'));
      card.appendChild(el('span', 'materin-learn-today__title', t(today.title)));
      card.appendChild(el('span', 'materin-learn-today__go', lang() === 'en' ? 'Read →' : '去读 →'));
      head.appendChild(card);
    }
    app.appendChild(head);

    var map = el('div', 'materin-learn-map');
    meta.stages.forEach(function (st) {
      var box = el('article', 'materin-learn-map__stage' +
        (todayN >= st.days[0] && todayN <= st.days[1] ? ' is-current' : ''));
      var h = el('h2', 'materin-learn-map__stage-h');
      h.appendChild(el('span', 'materin-learn-map__stage-no', String(st.id).padStart(2, '0')));
      h.appendChild(el('span', 'materin-learn-map__stage-name', t({ zh: st.zh, en: st.en })));
      h.appendChild(el('span', 'materin-learn-map__stage-days', 'D' + st.days[0] + '–' + st.days[1]));
      box.appendChild(h);

      /* 已发布的该阶段天数，按序号正序列最近 3 课（可点） */
      var stageDays = days.filter(function (d) { return d.stage === st.id; }).sort(function (a, b) { return a.n - b.n; });
      if (stageDays.length) {
        stageDays.forEach(function (d) {
          var link = el('a', 'materin-learn-map__day');
          link.href = 'day.html?d=' + d.n;
          var tag = el('span', 'materin-learn-map__day-no', 'D' + d.n);
          var txt = el('span', 'materin-learn-map__day-title', t(d.title));
          link.appendChild(tag); link.appendChild(txt);
          box.appendChild(link);
        });
          } else {
        var first = days.find(function (d) { return d.stage === st.id; });
        box.appendChild(el('p', 'materin-learn-map__stage-p', lang() === 'en'
          ? 'Coming at D' + st.days[0]
          : '第 ' + st.days[0] + ' 天开讲'));
      }
      map.appendChild(box);
    });
    app.appendChild(map);
  }

  var dParam = qs('d');
  function boot() {
    app.innerHTML = '';
    if (dParam) renderDay(parseInt(dParam, 10) || 1);
    else renderHome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.materin-learn-lang button')) {
      setTimeout(boot, 0);
    }
  });

  /* 竖屏录屏版：?stage=1 → 1080×1920 舞台 */
  if (qs('stage')) document.body.classList.add('is-stage');
})();
