/* Materin Tech org site — 无依赖前端脚本：主题、中英切换、项目列表渲染 */
(function () {
  'use strict';

  var root = document.documentElement;

  // ---------- 年份 ----------
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- 主题 ----------
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // ---------- 语言 ----------
  var LANG = root.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  var langBtn = document.getElementById('lang-toggle');
  var T = {
    zh: {
      all: '全部',
      empty: '该分类下暂无项目。',
      loadFail: '项目列表加载失败',
      loadHint: '请检查 <code>data/projects.json</code> 是否存在且为合法 JSON。',
      noDesc: '暂无描述',
      details: '介绍页',
      live: '在线预览',
      source: '源码'
    },
    en: {
      all: 'All',
      empty: 'No projects in this category yet.',
      loadFail: 'Failed to load the project list',
      loadHint: 'Check that <code>data/projects.json</code> exists and is valid JSON.',
      noDesc: 'No description yet',
      details: 'Details',
      live: 'Live',
      source: 'Source'
    }
  };

  var grid = document.getElementById('project-grid');
  var filters = document.getElementById('filters');
  var statRepos = document.querySelector('[data-stat="repos"]');
  var projects = [];
  var activeTag = 'all';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function localized(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[LANG] || v.zh || v.en || '';
  }

  function cardHtml(p) {
    var t = T[LANG];
    var tags = (p.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    var title = p.page
      ? '<a href="' + esc(p.page) + '">' + esc(p.name) + '</a>'
      : '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a>';
    var meta = [
      p.language ? '<span>' + esc(p.language) + '</span>' : '',
      p.updated ? '<span>' + esc(p.updated) + '</span>' : '',
      p.visibility ? '<span>' + esc(p.visibility) + '</span>' : ''
    ].join('');
    var links = [];
    // 站内优先：卡片只指向站内说明页/站内预览，不直接跳转 GitHub
    if (p.page) links.push('<a href="' + esc(p.page) + '">' + t.details + ' →</a>');
    if (p.homepage) links.push('<a href="' + esc(p.homepage) + '" target="_blank" rel="noopener">' + t.live + ' ↗</a>');
    return '<article class="card">' +
      '<h3>' + title + (p.version ? ' <span class="pill neutral">v' + esc(p.version) + '</span>' : '') + '</h3>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') +
      '<p>' + esc(localized(p.description) || t.noDesc) + '</p>' +
      '<div class="meta">' + meta + links.join('') + '</div>' +
      '</article>';
  }

  function render() {
    if (!grid) return;
    var list = activeTag === 'all'
      ? projects
      : projects.filter(function (p) { return (p.tags || []).indexOf(activeTag) !== -1; });
    grid.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<p class="empty">' + esc(T[LANG].empty) + '</p>';
  }

  function buildFilters() {
    if (!filters) return;
    var counts = {};
    projects.forEach(function (p) {
      (p.tags || []).forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
    });
    var keys = Object.keys(counts).sort();
    if (!keys.length) { filters.innerHTML = ''; return; }
    var chips = ['<button class="chip" type="button" data-tag="all" aria-pressed="' +
      (activeTag === 'all') + '">' + esc(T[LANG].all) + ' (' + projects.length + ')</button>'];
    keys.forEach(function (k) {
      chips.push('<button class="chip" type="button" data-tag="' + esc(k) + '" aria-pressed="' +
        (activeTag === k) + '">' + esc(k) + ' (' + counts[k] + ')</button>');
    });
    filters.innerHTML = chips.join('');
  }

  function applyLang(l) {
    LANG = l;
    root.setAttribute('data-lang', l);
    root.lang = l === 'zh' ? 'zh-CN' : 'en';
    if (langBtn) {
      langBtn.textContent = l === 'zh' ? 'EN' : '中文';
      langBtn.setAttribute('aria-label', l === 'zh' ? 'Switch to English' : '切换到中文');
    }
    buildFilters();
    render();
  }

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      var next = LANG === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('lang', next); } catch (e) {}
      applyLang(next);
    });
  }

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      activeTag = btn.getAttribute('data-tag');
      Array.prototype.forEach.call(filters.querySelectorAll('.chip'), function (c) {
        c.setAttribute('aria-pressed', String(c === btn));
      });
      render();
    });
  }

  // ---------- 数据 ----------
  if (grid) {
    fetch('/data/projects.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        projects = Array.isArray(data) ? data : (data.projects || []);
        if (statRepos) statRepos.textContent = String(projects.length);
        applyLang(LANG);
      })
      .catch(function (err) {
        grid.innerHTML = '<p class="empty">' + esc(T[LANG].loadFail) + '（' + esc(err.message) + '）。' +
          T[LANG].loadHint + '</p>';
      });
  } else {
    applyLang(LANG);
  }
})();
