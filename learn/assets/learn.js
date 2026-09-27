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
        stageDays.slice(-3).forEach(function (d) {
          var link = el('a', 'materin-learn-map__day');
          link.href = 'day.html?d=' + d.n;
          var tag = el('span', 'materin-learn-map__day-no', 'D' + d.n);
          var txt = el('span', 'materin-learn-map__day-title', t(d.title));
          link.appendChild(tag); link.appendChild(txt);
          box.appendChild(link);
        });
        if (stageDays.length > 3) {
          box.appendChild(el('p', 'materin-learn-map__more', (lang() === 'en'
            ? '+' + (stageDays.length - 3) + ' earlier days'
            : '前 ' + (stageDays.length - 3) + ' 天见每日页存档')));
        }
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
