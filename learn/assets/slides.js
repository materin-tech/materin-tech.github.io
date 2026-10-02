/* AI 原生学习路线 · 16:9 图组渲染器
   ?d=N 逐页渲染该天幻灯；每页独立 1920×1080，上下滚动或逐页截图。
   契约：materin-learn-slide* / materin-learn-cover* / materin-learn-content* /
        materin-learn-viz* / materin-learn-quote / materin-learn-end*。 */
(function () {
  'use strict';

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function lang() { return 'zh'; }   // 抖音图组默认中文；后续可扩展 ?lang=en

  function t(obj) { return obj ? (obj[lang()] || obj.zh || '') : ''; }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function brand(root) {
    root.appendChild(el('div', 'materin-learn-slide__page', ''));
    root.appendChild(el('div', 'materin-learn-slide__brand', 'Materin · AI 原生学习路线'));
  }

  function setPageNos() {
    var pages = document.querySelectorAll('.materin-learn-slide__page');
    pages.forEach(function (p, i) {
      p.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    });
  }

  /* 封面 */
  function cover(day, stageName) {
    var s = el('section', 'materin-learn-slide materin-learn-slide-page');
    var c = el('div', 'materin-learn-cover');
    c.appendChild(el('div', 'materin-learn-cover__kicker', '第 ' + day.n + ' 天 · ' + stageName));
    c.appendChild(el('h1', 'materin-learn-cover__title', t(day.title)));
    c.appendChild(el('p', 'materin-learn-cover__sub', t(day.subtitle)));
    if (day.anim && day.anim.coverHook) {
      var hook = el('p', 'materin-learn-cover__sub');
      hook.innerHTML = '';
      var hl = el('span', 'hl', t(day.anim.coverHook));
      hook.appendChild(hl);
      c.appendChild(hook);
    }
    var chips = el('div', 'materin-learn-cover__chips');
    day.sections.slice(0, 3).forEach(function (sec) {
      var h = t(sec.h);
      /* 胶囊取「：」或「——」后的短后缀；都没有则截到 14 字，避免整句塞爆胶囊互相压字 */
      var m = h.split('：');
      var txt = m.length > 1 ? m[1] : h;
      m = txt.split('——');
      if (m.length > 1) txt = m[1];
      if (txt.length > 14) txt = txt.slice(0, 14);
      chips.appendChild(el('span', 'materin-learn-cover__chip', txt));
    });
    c.appendChild(chips);
    s.appendChild(c);
    brand(s);
    return s;
  }

  /* 内容页（带右侧可视化板） */
  function content(day, idx, sec) {
    var s = el('section', 'materin-learn-slide materin-learn-slide-page');
    var c = el('div', 'materin-learn-content');
    var head = el('div', 'materin-learn-content__head');
    head.appendChild(el('span', 'materin-learn-content__no', String(idx + 1).padStart(2, '0')));
    head.appendChild(el('h2', 'materin-learn-content__h', t(sec.h)));
    c.appendChild(head);

    var body = el('div', 'materin-learn-content__body');
    var text = el('div', 'materin-learn-content__text');
    text.appendChild(el('p', 'materin-learn-content__p', t(sec.p)));
    if (sec.deep) text.appendChild(el('p', 'materin-learn-content__p', t(sec.deep)));
    if (sec.example) {
      var q = el('div', 'materin-learn-quote');
      q.textContent = t(sec.example.h) + '：' + t(sec.example.p);
      text.appendChild(q);
    }
    if (sec.misconception) {
      var m = el('div', 'materin-learn-quote');
      m.style.borderLeftColor = 'var(--materin-warn)';
      m.textContent = t(sec.misconception.h) + '：' + t(sec.misconception.p);
      text.appendChild(m);
    }
    body.appendChild(text);

    var viz = vizBoard(day, idx);
    if (viz) body.appendChild(viz);
    c.appendChild(body);
    s.appendChild(c);
    brand(s);
    return s;
  }

  /* 可视化板：counter → token 切分；similarity → 语义坐标；其他给通用摘句板 */
  function vizBoard(day, idx) {
    var v = el('div', 'materin-learn-viz');
    if (day.anim && day.anim.tpl === 'counter') {
      if (idx === 0) {
        var src = el('div', 'materin-learn-viz__label', '原句：' + t(day.anim.sentence));
        v.appendChild(src);
        var chips = el('div', 'materin-learn-viz__chips');
        var merged = { '看清': 1, '说清': 1 };
        day.anim.tokensZh.forEach(function (tok) {
          var cls = 'materin-learn-viz__chip' + (merged[tok] ? ' materin-learn-viz__chip--merged' : '');
          chips.appendChild(el('span', cls, tok));
        });
        v.appendChild(chips);
        v.appendChild(el('div', 'materin-learn-viz__label', '模型眼里的同一段话：10 个 token'));
      } else {
        var bars = el('div', 'materin-learn-viz__bars');
        var rows = [
          { tag: '中文', val: day.anim.counts.zh, cls: '' },
          { tag: '英文', val: day.anim.counts.en, cls: ' materin-learn-viz__bar--en' }
        ];
        rows.forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = (r.val / Math.max(day.anim.counts.zh, day.anim.counts.en) * 100) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', String(r.val)));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一句话的 token 数（' + day.anim.counts.chars + ' 个字）'));
      }
    } else if (day.anim && day.anim.tpl === 'similarity') {
      if (idx === 0) {
        var dots = el('div', 'materin-learn-viz__chips');
        day.anim.points.forEach(function (p) {
          dots.appendChild(el('span', 'materin-learn-viz__chip', p.w));
        });
        v.appendChild(dots);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一个语义空间里的坐标（示意）'));
      } else {
        var bars = el('div', 'materin-learn-viz__bars');
        day.anim.pairs.forEach(function (pr) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', pr.a + '·' + pr.b));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar');
          bar.style.width = (pr.sim * 100) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', pr.sim.toFixed(2)));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '余弦相似度（示意数值）'));
      }
    } else if (day.anim && day.anim.tpl === 'spectrum') {
      if (idx === 0) {
        var src = el('div', 'materin-learn-viz__label', '待补全：' + t(day.anim.sentence));
        v.appendChild(src);
        var rows = el('div', 'materin-learn-viz__bars');
        day.anim.candidates.forEach(function (c, ci) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', c.w));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar');
          bar.style.width = day.anim.temperatures[0].probs[ci] + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', day.anim.temperatures[0].probs[ci].toFixed(1) + '%'));
          rows.appendChild(row);
        });
        v.appendChild(rows);
        v.appendChild(el('div', 'materin-learn-viz__label', '候选概率（T=0.5，真实 softmax）'));
      } else {
        var bars = el('div', 'materin-learn-viz__bars');
        var tagZh = { 0.5: '保守', 1.0: '默认', 2.0: '放飞' };
        day.anim.temperatures.forEach(function (tp) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', 'T=' + tp.t));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar');
          bar.style.width = tp.probs[0] + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', '「热」' + tp.probs[0].toFixed(1) + '%'));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一候选「热」在不同温度下的概率'));
      }
    } else if (day.anim && day.anim.tpl === 'windowfill') {
      if (idx === 0) {
        /* 第 1 轮的静态预算格：与动效页同一套窗口格 */
        var grid = el('div', 'materin-learn-winfill__grid');
        day.anim.blocks.forEach(function (b) {
          for (var i = 0; i < b.n; i++) {
            grid.appendChild(el('div', 'materin-learn-winfill__cell materin-learn-winfill__cell--' + b.k));
          }
        });
        var used = day.anim.blocks.reduce(function (s, b) { return s + b.n; }, 0);
        for (var f = used; f < day.anim.budget; f++) {
          grid.appendChild(el('div', 'materin-learn-winfill__cell materin-learn-winfill__cell--free'));
        }
        v.appendChild(grid);
        v.appendChild(el('div', 'materin-learn-viz__label',
          '第 1 轮：' + used + '/' + day.anim.budget + ' 格，历史每轮继续增长'));
      } else if (idx === 1) {
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '整本硬塞', val: 240, cls: ' materin-learn-viz__bar--en', txt: '240%' },
          { tag: '摘要两遍', val: 15, cls: '', txt: '≈15%' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.min(r.val, 100) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '400 页 PDF 的窗口占用（128K = 100%）'));
      } else if (idx === 2) {
        var bars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '首尾内容', val: 95, cls: '', txt: '≈95%' },
          { tag: '中段内容', val: 65, cls: ' materin-learn-viz__bar--en', txt: '≈65%' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars2.appendChild(row);
        });
        v.appendChild(bars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '关键信息的召回率（大海捞针类测试，示意）'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '窗口经济学：后面 164 天的成本模型'));
      }
    } else if (day.anim && day.anim.tpl === 'duel') {
      if (idx === 0) {
        /* 对决页：与动效页同一套左右对决卡（第 1 轮） */
        var r0 = day.anim.rounds[0];
        var duel = el('div', 'materin-learn-duel');
        var round = el('div', 'materin-learn-duel__round is-picked');
        ['a', 'b'].forEach(function (side) {
          round.appendChild(el('div', 'materin-learn-duel__card materin-learn-duel__card--' + side, t(r0[side])));
        });
        duel.appendChild(round);
        v.appendChild(duel);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一问题、两个回答——人类挑出更好的那个'));
      } else if (idx === 1) {
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: 'SFT 示范', val: 13, cls: '', txt: '≈1.3 万条' },
          { tag: 'RM 比较', val: 33, cls: '', txt: '≈3.3 万次' },
          { tag: 'PPO 比较', val: 31, cls: '', txt: '≈3.1 万次' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = (r.val / 33 * 100) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', 'InstructGPT 的人类操作量：合计约 7.7 万次'));
      } else if (idx === 2) {
        var bars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '预训练 token', val: 100, cls: ' materin-learn-viz__bar--en', txt: '15T' },
          { tag: '对齐人类数据', val: 3, cls: '', txt: '≈7.7 万条（<0.001%）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars2.appendChild(row);
        });
        v.appendChild(bars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '极小的数据量，决定产品成败的一步'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '对齐教它配合，治不好幻觉——第 9 天'));
      }
    } else if (day.anim && day.anim.tpl === 'flow') {
      if (idx === 0) {
        /* 流水线各级：格子数与动效页一致（筛选漏斗） */
        var rows = el('div', 'materin-learn-viz__bars');
        day.anim.steps.forEach(function (st) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', t({ zh: st.zh, en: st.en })));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar');
          bar.style.width = Math.max(6, st.n / 12 * 100) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', t({ zh: st.numZh, en: st.numEn })));
          rows.appendChild(row);
        });
        v.appendChild(rows);
        v.appendChild(el('div', 'materin-learn-viz__label', '流水线各级的量级（每级都在筛掉杂质）'));
      } else if (idx === 1) {
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '单人读 80 年', val: 1, cls: '', txt: '≈126 亿 token（0.1%）' },
          { tag: 'LLaMA 3 语料', val: 100, cls: ' materin-learn-viz__bar--en', txt: '15T token（100%）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '人类阅读量 vs 预训练语料（对数示意）'));
      } else if (idx === 2) {
        var bars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '参数文件', val: 3, cls: '', txt: '≈800GB（<3%）' },
          { tag: '原始文本', val: 100, cls: ' materin-learn-viz__bar--en', txt: '30TB+（100%）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars2.appendChild(row);
        });
        v.appendChild(bars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '不是存储，是有损压缩：97% 的原文没有进参数'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '毛坯只是起点：第 8 天讲对齐'));
      }
    } else if (day.sections[idx] && day.sections[idx].example) {
      v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
      v.appendChild(el('div', 'materin-learn-viz__label', '实例拆解'));
    } else {
      v.appendChild(el('div', 'materin-learn-viz__label', t(day.title)));
    }
    return v;
  }

  /* 结尾页：沉淀 + 动手 */
  function endPage(day) {
    var s = el('section', 'materin-learn-slide materin-learn-slide-page');
    var c = el('div', 'materin-learn-end');
    c.appendChild(el('div', 'materin-learn-end__kicker', '一句话带走'));
    c.appendChild(el('p', 'materin-learn-end__takeaway', t(day.takeaway)));
    c.appendChild(el('p', 'materin-learn-end__hint', '动手（15 分钟）：' + t(day.action.p)));
    c.appendChild(el('div', 'materin-learn-end__next', '明天继续 · 第 ' + (day.n + 1) + ' 天'));
    s.appendChild(c);
    brand(s);
    return s;
  }

  /* --- 翻页控制 --- */
  var current = 0;

  function buildNav(slides) {
    var nav = el('div', 'materin-learn-slide-nav');
    var prev = el('button', 'materin-learn-slide-nav__btn', '‹');
    prev.setAttribute('aria-label', '上一页');
    var dots = el('div', 'materin-learn-slide-nav__dots');
    slides.forEach(function (_, i) {
      var dot = el('button', 'materin-learn-slide-nav__dot');
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 页');
      dot.addEventListener('click', function () { go(i); });
      dots.appendChild(dot);
    });
    var next = el('button', 'materin-learn-slide-nav__btn', '›');
    next.setAttribute('aria-label', '下一页');
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
    document.body.appendChild(nav);

    function refresh() {
      [...dots.children].forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
      });
      prev.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      document.body.classList.toggle('is-first', current === 0);
    }
    nav.__refresh = refresh;
    nav.__prev = prev; nav.__next = next; nav.__dots = dots;

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(current - 1); }
    });
    nav.__refresh();

    var tx = null;
    document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (tx == null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 60) go(current + (dx < 0 ? 1 : -1));
      tx = null;
    }, { passive: true });
  }

  function go(i) {
    var slides = document.querySelectorAll('.materin-learn-slide-page');
    if (i < 0 || i >= slides.length) return;
    current = i;
    slides.forEach(function (s, k) {
      s.classList.toggle('is-active-slide', k === i);
    });
    window.scrollTo(0, 0);
    var nav = document.querySelector('.materin-learn-slide-nav');
    if (nav && nav.__refresh) nav.__refresh();
  }

  function render() {
    var n = parseInt(qs('d') || '1', 10);
    var day = (window.LEARN && window.LEARN.days) ? window.LEARN.days.find(function (d) { return d.n === n; }) : null;
    var root = document.getElementById('slide');
    if (!day) { root.textContent = 'Day ' + n + ' not published'; return; }
    var stage = window.LEARN.meta.stages.find(function (st) { return st.id === day.stage; });
    var stageName = stage ? t({ zh: stage.zh, en: stage.en }) : '';

    root.appendChild(cover(day, stageName));
    day.sections.forEach(function (sec, i) { root.appendChild(content(day, i, sec)); });
    root.appendChild(endPage(day));
    setPageNos();
    fitText();
    var pages = [...document.querySelectorAll('.materin-learn-slide-page')];
    if (!qs('export')) {
      pages.forEach(function (p, k) { p.classList.toggle('is-active-slide', k === 0); });
      buildNav(pages);
    }
    fitScale();
    window.addEventListener('resize', fitScale);
  }

  /* 窗口小于 1920 时整体缩放预览；截图时按 1920×1080 布局导出 */
  function fitScale() {
    var slide = document.querySelector('.materin-learn-slide-page.is-active-slide');
    if (!slide) return;
    var scale = Math.min(1, window.innerWidth / 1920);
    slide.style.transform = 'scale(' + scale + ')';
    document.body.style.height = (1080 * scale) + 'px';
  }

  /* 内容页文字自适应：超出安全区（标题 190 ～ 页脚 990）时逐级缩小字号。
     注意：文本列是 justify-content:center 的 flex，须在布局稳定后按「首个/末段元素」
     的实际边界判断，量整列会读到空 flex 的假值。 */
  function fitText() {
    requestAnimationFrame(function () {
      var pages = [...document.querySelectorAll('.materin-learn-slide-page')];
      pages.forEach(function (p) {
        var text = p.querySelector('.materin-learn-content__text');
        if (!text) return;
        var top = p.getBoundingClientRect().top;
        var parts = [...text.querySelectorAll('.materin-learn-content__p, .materin-learn-quote')];
        if (!parts.length) return;
        function bounds() {
          var lo = Infinity, hi = -Infinity;
          parts.forEach(function (e) {
            var r = e.getBoundingClientRect();
            lo = Math.min(lo, r.top); hi = Math.max(hi, r.bottom);
          });
          return [lo - top, hi - top];
        }
        for (var fs = 31; fs >= 22; fs -= 1.5) {
          parts.forEach(function (e) {
            e.style.fontSize = (e.classList.contains('materin-learn-quote') ? fs - 2 : fs) + 'px';
          });
          var b = bounds();
          if (b[1] <= 990 && b[0] >= 190) break;
        }
      });
    });
  }

  if (qs('export')) document.body.classList.add('is-export');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
