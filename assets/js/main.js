/* Materin Tech org site — 无依赖前端脚本 */
(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 主题切换 + 持久化
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  var grid = document.getElementById('project-grid');
  var filters = document.getElementById('filters');
  var stats = document.querySelector('[data-stat="repos"]');
  if (!grid) return;

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var itemHtml = function (p) {
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
    var live = p.homepage
      ? '<a href="' + esc(p.homepage) + '" target="_blank" rel="noopener">在线预览 ↗</a>'
      : '';
    var meta = [
      p.language ? '<span>' + esc(p.language) + '</span>' : '',
      p.updated ? '<span>更新 ' + esc(p.updated) + '</span>' : '',
      p.visibility ? '<span>' + esc(p.visibility) + '</span>' : ''
    ].join('');
    return '<article class="card">' +
      '<h3><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a></h3>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') +
      '<p>' + esc(p.description || '暂无描述') + '</p>' +
      (meta ? '<div class="meta">' + meta + live + '</div>' : '') +
      '</article>';
  };

  var projects = [];
  var activeTag = 'all';

  function render() {
    var list = activeTag === 'all'
      ? projects
      : projects.filter(function (p) { return (p.tags || []).indexOf(activeTag) !== -1; });
    grid.innerHTML = list.length
      ? list.map(itemHtml).join('')
      : '<p class="empty">该分类下暂无项目。</p>';
  }

  function buildFilters() {
    var tags = {};
    projects.forEach(function (p) {
      (p.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    });
    var keys = Object.keys(tags).sort();
    if (!keys.length || !filters) return;
    filters.innerHTML = ['all'].concat(keys).map(function (k) {
      var label = k === 'all' ? '全部 (' + projects.length + ')' : esc(k) + ' (' + tags[k] + ')';
      return '<button class="chip" type="button" data-tag="' + esc(k) + '" aria-pressed="' +
        (k === activeTag) + '">' + label + '</button>';
    }).join('');
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

  fetch('/data/projects.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      projects = Array.isArray(data) ? data : (data.projects || []);
      if (stats) stats.textContent = String(projects.length);
      buildFilters();
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<p class="empty">项目列表加载失败（' + esc(err.message) +
        '）。请检查 <code>data/projects.json</code> 是否存在且为合法 JSON。</p>';
    });
})();
