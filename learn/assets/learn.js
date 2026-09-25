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
    var head = el('header', 'materin-learn-dayhead');
    head.appendChild(el('h1', 'materin-learn-dayhead__title', lang() === 'en' ? 'AI-Native Learning Roadmap' : 'AI 原生学习路线'));
    head.appendChild(el('p', 'materin-learn-dayhead__sub', lang() === 'en'
      ? 'Foundations, then agents, then a reshaped way of thinking — ' + meta.total + ' days, one page a day.'
      : '从关键基础到 Agent，再到认知重塑——' + meta.total + ' 天，每天一页。'));
    app.appendChild(head);

    var map = el('div', 'materin-learn-map');
    var published = window.LEARN.days.map(function (d) { return d.n; });
    var todayN = published.length ? Math.max.apply(null, published) : 1;
    meta.stages.forEach(function (st) {
      var box = el('article', 'materin-learn-map__stage' +
        (todayN >= st.days[0] && todayN <= st.days[1] ? ' is-current' : ''));
      var h = el('h2', 'materin-learn-map__stage-h');
      h.appendChild(el('span', 'materin-learn-map__stage-no', String(st.id).padStart(2, '0')));
      h.appendChild(el('span', 'materin-learn-map__stage-name', t({ zh: st.zh, en: st.en })));
      h.appendChild(el('span', 'materin-learn-map__stage-days', 'D' + st.days[0] + '–' + st.days[1]));
      box.appendChild(h);
      var first = window.LEARN.days.find(function (d) { return d.stage === st.id; });
      if (first) {
        var link = el('a', 'materin-learn-map__stage-p');
        link.href = 'day.html?d=' + first.n;
        link.textContent = lang() === 'en' ? 'Start: ' + t(first.title) : '开篇：' + t(first.title);
        link.style.color = '';
        box.appendChild(link);
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
