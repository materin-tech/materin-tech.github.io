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
      /* 胶囊取「：」或「——」后的短后缀；超长则截到 14 字——截断点找最近的
         空格/标点回退，避免断在词中间（D8/D9 硬截断曾收在「接着」「不」上） */
      var m = h.split('：');
      var txt = m.length > 1 ? m[1] : h;
      m = txt.split('——');
      if (m.length > 1) txt = m[1];
      if (txt.length > 14) {
        txt = txt.slice(0, 14);
        var cut = Math.max(txt.lastIndexOf(' '), Math.max(
          txt.lastIndexOf('？'), Math.max(
          txt.lastIndexOf('，'), txt.lastIndexOf('、'))));
        if (cut >= 6) txt = txt.slice(0, cut);
      }
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
    } else if (day.anim && day.anim.tpl === 'fabricate') {
      if (idx === 0) {
        /* 判定页：与动效页同一套判定卡（第 1 轮：编造） */
        var r0 = day.anim.rounds[0];
        var fab = el('div', 'materin-learn-fab');
        var round0 = el('div', 'materin-learn-fab__round materin-learn-fab__round--' + r0.verdict + ' is-revealed');
        round0.appendChild(el('div', 'materin-learn-fab__q', t(r0.q)));
        var row0 = el('div', 'materin-learn-fab__row');
        row0.appendChild(el('span', 'materin-learn-fab__mark', r0.verdictZh));
        row0.appendChild(el('div', 'materin-learn-fab__card', t(r0.a)));
        round0.appendChild(row0);
        fab.appendChild(round0);
        v.appendChild(fab);
        v.appendChild(el('div', 'materin-learn-viz__label', '语料里没有的事实 → 联想补全交卷'));
      } else if (idx === 1) {
        /* Mata 案：引文「形状」为何完美——法律引用模式在语料里的相对体量 */
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '格式模式', val: 100, cls: ' materin-learn-viz__bar--en', txt: '百万次' },
          { tag: '具体判例', val: 6, cls: '', txt: '极稀疏' }
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
        v.appendChild(el('div', 'materin-learn-viz__label', '引用的「形」百万次重复，「实」稀疏长尾——形易学，实无处学'));
      } else if (idx === 2) {
        var bars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '编造/绕开', val: 88, cls: '', txt: '88%' },
          { tag: '说不知道', val: 12, cls: ' materin-learn-viz__bar--en', txt: '12%' }
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
        v.appendChild(el('div', 'materin-learn-viz__label', '长尾问题回答形态示意：语料里「不确定」句式稀有（20 问实测）'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '治不好，但能圈住：RAG 的第一理由（第 85 天）'));
      }
    } else if (day.anim && day.anim.tpl === 'lora') {
      if (idx === 0) {
        /* 与动效页同一套冻结墙 + LoRA 补丁（静态、全点亮） */
        var lora = el('div', 'materin-learn-lora');
        var wallTag = el('div', 'materin-learn-lora__wall-tag',
          lang() === 'en' ? 'pretrained weights W (frozen)' : '预训练权重 W（冻结）');
        var wall = el('div', 'materin-learn-lora__wall');
        day.anim.blocks.forEach(function (b) {
          for (var i = 0; i < b.n; i++) {
            wall.appendChild(el('div', 'materin-learn-lora__cell materin-learn-lora__cell--' + b.k));
          }
        });
        var patchTag = el('div', 'materin-learn-lora__patch-tag',
          lang() === 'en' ? 'LoRA B·A (trainable)' : 'LoRA B·A（参与训练）');
        var patch = el('div', 'materin-learn-lora__patch is-live');
        var laneA = el('div', 'materin-learn-lora__lane');
        var laneB = el('div', 'materin-learn-lora__lane');
        for (var m = 0; m < 4; m++) {
          laneA.appendChild(el('div', 'materin-learn-lora__mini materin-learn-lora__mini--a'));
          laneB.appendChild(el('div', 'materin-learn-lora__mini materin-learn-lora__mini--b'));
        }
        patch.appendChild(laneA);
        patch.appendChild(laneB);
        var pct = el('div', 'materin-learn-lora__pct', day.anim.pct.toFixed(1) + '%');
        lora.appendChild(wallTag);
        lora.appendChild(wall);
        lora.appendChild(patchTag);
        lora.appendChild(patch);
        lora.appendChild(pct);
        v.appendChild(lora);
        v.appendChild(el('div', 'materin-learn-viz__label', '100 格权重里 0.4% 参与训练，梯度只流向批注层'));
      } else if (idx === 1) {
        var lbars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '全量微调', val: 100, cls: '', txt: '≈1TB' },
          { tag: 'LoRA', val: 2, cls: ' materin-learn-viz__bar--en', txt: '≈4GB' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          lbars.appendChild(row);
        });
        v.appendChild(lbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '微调 70B 的显存账本（Adam，示意）'));
      } else if (idx === 2) {
        var lbars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '微调=知识库', val: 88, cls: '', txt: '长尾细节多会编' },
          { tag: '知识放外部', val: 12, cls: ' materin-learn-viz__bar--en', txt: '窗口+检索' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          lbars2.appendChild(row);
        });
        v.appendChild(lbars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '正确分工：微调塑「口音」，知识交给窗口与检索'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '底座 + 补丁：领域化的标准架构（第 141 天）'));
      }
    } else if (day.anim && day.anim.tpl === 'quant') {
      if (idx === 0) {
        /* 与动效页同一套三档存储（静态、全部就位） */
        var quant = el('div', 'materin-learn-quant');
        var qrows = el('div', 'materin-learn-quant__rows');
        day.anim.levels.forEach(function (lv) {
          var row = el('div', 'materin-learn-quant__row materin-learn-quant__row--' + lv.k + ' is-done');
          row.appendChild(el('span', 'materin-learn-quant__tag', lv.tagZh));
          var cells = el('div', 'materin-learn-quant__cells');
          cells.style.setProperty('--quant-bytes', String(lv.cellBytes));
          for (var c = 0; c < day.anim.weights; c++) {
            cells.appendChild(el('span', 'materin-learn-quant__cell'));
          }
          row.appendChild(cells);
          row.appendChild(el('span', 'materin-learn-quant__gb-tag', lv.gb + ' GB'));
          var q = el('span', 'materin-learn-quant__q', lv.q >= 100 ? '100%' : '≈' + lv.q + '%');
          row.appendChild(q);
          qrows.appendChild(row);
        });
        quant.appendChild(qrows);
        v.appendChild(quant);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一组权重的三种存法：格宽 = 每权重字节数'));
      } else if (idx === 1) {
        var qbars = el('div', 'materin-learn-viz__bars');
        [
          { tag: 'FP16 两个 A100', val: 100, cls: ' materin-learn-viz__bar--en', txt: '140GB' },
          { tag: 'INT8 一张 A100', val: 50, cls: '', txt: '70GB（≈99%）' },
          { tag: 'INT4 一张 A100 有余', val: 25, cls: '', txt: '35GB（≈97%）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          qbars.appendChild(row);
        });
        v.appendChild(qbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '70B 模型的三档体积（右为能力保留率）'));
      } else if (idx === 2) {
        var qbars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '热门知识', val: 96, cls: '', txt: '几乎无感' },
          { tag: '长尾细节', val: 30, cls: ' materin-learn-viz__bar--en', txt: 'INT4 先受损' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          qbars2.appendChild(row);
        });
        v.appendChild(qbars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '量化损失先落在哪（示意）：越冷门越见真章'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '变小有两条路：量化之外，明天讲蒸馏（第 12 天）'));
      }
    } else if (day.anim && day.anim.tpl === 'distill') {
      /* 老师软分布 → 学生软分布（静态就位版，is-done 免动画） */
      if (idx === 0) {
        var dr = el('div', 'materin-learn-distill is-teacher');
        var dq = el('div', 'materin-learn-distill__q', t(day.anim.sentence));
        dr.appendChild(dq);
        var dpanel = el('div', 'materin-learn-distill__panel');
        var dbars = el('div', 'materin-learn-distill__bars');
        day.anim.candidates.forEach(function (w, i) {
          var row = el('div', 'materin-learn-distill__row is-teacher' +
            (i === 1 ? ' materin-learn-distill__row--dark' : ''));
          row.appendChild(el('span', 'materin-learn-distill__word', w));
          var track = el('div', 'materin-learn-distill__track');
          var bar = el('div', 'materin-learn-distill__bar');
          bar.style.width = day.anim.teacher[i] + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-distill__num', day.anim.teacher[i] + '%'));
          dbars.appendChild(row);
        });
        dpanel.appendChild(dbars);
        dr.appendChild(dpanel);
        dr.appendChild(el('span', 'materin-learn-distill__who', '老师（软标签）'));
        dr.appendChild(el('p', 'materin-learn-distill__note', t(day.anim.note)));
        v.appendChild(dr);
        v.appendChild(el('div', 'materin-learn-viz__label', '老师的概率表：第二名的 7% 是暗知识'));
      } else if (idx === 1) {
        var dbars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '老师 400M 集成', val: 100, cls: '', txt: '错误率 1.4%' },
          { tag: '学生 40M 从头训', val: 28, cls: ' materin-learn-viz__bar--en', txt: '5%（没有软标签）' },
          { tag: '学生 40M 蒸馏后', val: 70, cls: '', txt: '2% 以下' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          dbars2.appendChild(row);
        });
        v.appendChild(dbars2);
        v.appendChild(el('div', 'materin-learn-viz__label', 'MNIST 实账：参数缩 10 倍，错误率只多半个点'));
      } else {
        var dtwo = el('div', 'materin-learn-viz__bars');
        [
          { tag: '量化', val: 100, cls: '', txt: '同一个小模型存在哪（压缩存储）' },
          { tag: '蒸馏', val: 100, cls: ' materin-learn-viz__bar--en', txt: '造一个更强的小模型（重训参数）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          dtwo.appendChild(row);
        });
        v.appendChild(dtwo);
        v.appendChild(el('div', 'materin-learn-viz__label', '两条「变小」的路：先蒸后量是常见组合'));
      }
    } else if (day.anim && day.anim.tpl === 'kvcache') {
      if (idx === 0) {
        /* 与动效页同一套两行缓存格：提示词整行就位 + 生成行静态全亮（is-in 免动画） */
        var kv = el('div', 'materin-learn-kv');
        var kvTagP = el('div', 'materin-learn-kv__tag', '提示词 K/V（预填充，一次算好）');
        var kvPrompt = el('div', 'materin-learn-kv__row materin-learn-kv__row--prompt');
        for (var p = 0; p < (day.anim.promptN || 12); p++) {
          kvPrompt.appendChild(el('div', 'materin-learn-kv__cell materin-learn-kv__cell--prompt'));
        }
        var kvTagG = el('div', 'materin-learn-kv__tag', '生成 K/V（每词追加 1 格）');
        var kvGen = el('div', 'materin-learn-kv__row materin-learn-kv__row--gen');
        for (var q = 0; q < (day.anim.genN || 6); q++) {
          kvGen.appendChild(el('div', 'materin-learn-kv__cell materin-learn-kv__cell--gen is-in'));
        }
        kv.appendChild(kvTagP);
        kv.appendChild(kvPrompt);
        kv.appendChild(kvTagG);
        kv.appendChild(kvGen);
        /* 静态读数行：填满右侧板并呼应「显存换时间」的叙事 */
        var kvRead = el('div', 'materin-learn-kv__readout');
        kvRead.appendChild(el('span', 'materin-learn-kv__step', '预填充 1 次 + 逐词追加'));
        kvRead.appendChild(el('span', 'materin-learn-kv__cached', String((day.anim.promptN || 12) + (day.anim.genN || 6))));
        kvRead.appendChild(el('span', 'materin-learn-kv__cached-label', '格 K/V 已缓存'));
        kv.appendChild(kvRead);
        var kvRedo = el('div', 'materin-learn-kv__redo');
        kvRedo.appendChild(el('span', 'materin-learn-kv__redo-num', String((day.anim.promptN || 12) + (day.anim.genN || 6) - 1)));
        kvRedo.appendChild(el('span', 'materin-learn-kv__redo-label', '格要重算（若无缓存）'));
        kv.appendChild(kvRedo);
        v.appendChild(kv);
        v.appendChild(el('div', 'materin-learn-viz__label', '预填充一次建好缓存，之后每生成一词只追加一格'));
      } else if (idx === 1) {
        var kbars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '8K 窗口', val: 6, cls: '', txt: '≈4GB 缓存' },
          { tag: '128K 满窗', val: 100, cls: ' materin-learn-viz__bar--en', txt: '≈64GB（权重 14GB 的 4 倍）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          kbars.appendChild(row);
        });
        v.appendChild(kbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '7B 模型 FP16 的 KV cache 显存账（每 token ≈0.5MB）'));
      } else if (idx === 2) {
        var kbars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '前缀全价', val: 100, cls: '', txt: '300 万 token/天' },
          { tag: '前缀命中', val: 10, cls: ' materin-learn-viz__bar--en', txt: '≈30 万等效（约 1/10）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          kbars2.appendChild(row);
        });
        v.appendChild(kbars2);
        v.appendChild(el('div', 'materin-learn-viz__label', '客服机器人 3000-token 固定前缀 × 1000 轮：排版一条规则，成本降 90%'));
      } else {
        v.appendChild(el('div', 'materin-learn-viz__num', '✦'));
        v.appendChild(el('div', 'materin-learn-viz__label', '窗口经济学第二轴：token 复用了几次（第 4 天）'));
      }
    } else if (day.anim && day.anim.tpl === 'atlas') {
      /* 静态迷你地图：三色站点 + 桥（黄色虚线）按 day 号连线，与动效页同一叙事 */
      var byDA = {};
      day.anim.nodes.forEach(function (nd) { byDA[nd.d] = nd; });
      var mini = el('div', 'materin-learn-atlas');
      var mfield = el('div', 'materin-learn-atlas__field');
      day.anim.clusters.forEach(function (c) {
        mfield.appendChild(el('div', 'materin-learn-atlas__band materin-learn-atlas__band--' + c.k));
      });
      var mlegend = el('div', 'materin-learn-atlas__legend');
      day.anim.clusters.forEach(function (c) {
        var item = el('span', 'materin-learn-atlas__legend-item materin-learn-atlas__legend-item--' + c.k);
        item.appendChild(el('span', 'materin-learn-atlas__legend-dot'));
        item.appendChild(el('span', null, t({ zh: c.zh, en: c.en })));
        mlegend.appendChild(item);
      });
      var mbridge = el('span', 'materin-learn-atlas__legend-item materin-learn-atlas__legend-item--bridge');
      mbridge.appendChild(el('span', 'materin-learn-atlas__legend-dot'));
      mbridge.appendChild(el('span', null, '跨线桥'));
      mlegend.appendChild(mbridge);
      day.anim.nodes.forEach(function (nd) {
        var node = el('div', 'materin-learn-atlas__node materin-learn-atlas__node--' + nd.k);
        node.style.left = nd.x + '%';
        node.style.top = nd.y + '%';
        node.appendChild(el('span', 'materin-learn-atlas__node-d', 'D' + nd.d));
        node.appendChild(el('span', 'materin-learn-atlas__node-name', t({ zh: nd.zh, en: nd.en })));
        mfield.appendChild(node);
      });
      var miniEdges = [];
      day.anim.edges.forEach(function (e) {
        var pa = byDA[e.a], pb = byDA[e.b];
        if (!pa || !pb) return;
        var bridge = e.k === 'bridge';
        var line = el('div', 'materin-learn-atlas__edge' + (bridge ? ' materin-learn-atlas__edge--bridge' : ''));
        line.__pa = pa; line.__pb = pb;
        mfield.appendChild(line);
        miniEdges.push(line);
      });
      function layoutMini() {
        var W = mfield.offsetWidth, H = mfield.offsetHeight;
        if (!W || !H) return;
        miniEdges.forEach(function (line) {
          var ax = line.__pa.x / 100 * W, ay = line.__pa.y / 100 * H;
          var bx = line.__pb.x / 100 * W, by = line.__pb.y / 100 * H;
          var dx = bx - ax, dy = by - ay;
          line.style.left = ax + 'px';
          line.style.top = ay + 'px';
          line.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
          line.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
        });
      }
      mini.appendChild(mfield);
      mini.appendChild(mlegend);
      v.appendChild(mini);
      requestAnimationFrame(function () { layoutMini(); });
      window.addEventListener('resize', layoutMini);
      v.appendChild(el('div', 'materin-learn-viz__label', '三线一图：14 站 13 边，黄虚线是跨线桥（读 · 学 · 用）'));
    } else if (day.anim && day.anim.tpl === 'moe') {
      if (idx === 0) {
        /* 机制页：逐 token 路由示意——当前词点走不同专家组合（确定性映射） */
        var route = el('div', 'materin-learn-viz__routes');
        (day.anim.tokens || []).forEach(function (tok, i) {
          var nExp = day.anim.expertCount || 8;
          var scores = [];
          for (var e = 0; e < nExp; e++) {
            scores.push({ v: 0.5 + 0.5 * Math.abs(Math.sin((i + 1) * 3.7 + (e + 1) * 1.9)), e: e });
          }
          scores.sort(function (x, y) { return y.v - x.v; });
          var row = el('div', 'materin-learn-viz__route-row');
          row.appendChild(el('span', 'materin-learn-viz__route-word', tok));
          var dots = el('span', 'materin-learn-viz__route-dots');
          scores.slice(0, day.anim.topK || 2).forEach(function (s) {
            dots.appendChild(el('span', 'materin-learn-viz__route-dot', String(s.e + 1)));
          });
          row.appendChild(dots);
          route.appendChild(row);
        });
        v.appendChild(route);
        v.appendChild(el('div', 'materin-learn-viz__label', '路由逐 token 独立：6 个词走 6 种专家组合（示意）'));
      } else if (idx === 1) {
        /* 为什么页：三台机器激活率对照 */
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: 'Mixtral 8×7B', val: 28, cls: '', txt: '47B/13B' },
          { tag: 'DeepSeek-V3', val: 5.5, cls: ' materin-learn-viz__bar--en', txt: '671B/37B' },
          { tag: '稠密 Llama-70B', val: 100, cls: '', txt: '70B/70B' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(1.5, r.val) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '激活率：容量跟总参数走，算力跟激活参数走'));
      } else {
        /* 延伸页：显存墙——bf16 vs int4 的部署账 */
        var bars3 = el('div', 'materin-learn-viz__bars');
        [
          { tag: 'bf16 全量', val: 100, cls: '', txt: '≈1.3TB · 17 张 80GB 卡' },
          { tag: 'int4 量化', val: 26, cls: ' materin-learn-viz__bar--en', txt: '≈335GB · 5 张卡（第 11 天）' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(1.5, r.val) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars3.appendChild(row);
        });
        v.appendChild(bars3);
        v.appendChild(el('div', 'materin-learn-viz__label', '显存按总参数全量买单——省算力不省显存，量化是解药'));
      }
    } else if (day.anim && day.anim.tpl === 'loop') {
      if (idx === 0) {
        /* 五步链条 + 一次 tick 的产出：与动效页同一叙事（静态全亮） */
        var chain = el('div', 'materin-learn-viz__chips');
        (day.anim.stepsZh).forEach(function (sName, k) {
          chain.appendChild(el('span', 'materin-learn-viz__chip', sName));
          if (k < day.anim.stepsZh.length - 1) chain.appendChild(el('span', 'materin-learn-viz__chip--alt', '→'));
        });
        v.appendChild(chain);
        var bars = el('div', 'materin-learn-viz__bars');
        [
          { tag: '无缓存：每圈重算全部历史', val: 100, cls: '', txt: '≈13.5 万次' },
          { tag: '有 KV cache：每圈只算新查询', val: 0.4, cls: ' materin-learn-viz__bar--en', txt: '500 次' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(1.5, r.val) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars.appendChild(row);
        });
        v.appendChild(bars);
        v.appendChild(el('div', 'materin-learn-viz__label', '一次 tick 五步，500 token 回答 = 500 圈（缓存省 99.6%）'));
      } else if (idx === 1) {
        /* 雪球：一次跑偏被钉回输入后被放大——重复句计数示意 */
        var bars2 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '跑偏 1 次', val: 8, cls: '', txt: '1 句' },
          { tag: '被钉回后继续采样', val: 55, cls: '', txt: '连错 5 句' },
          { tag: '无纠错回路', val: 100, cls: ' materin-learn-viz__bar--en', txt: '整段带偏' }
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
        v.appendChild(el('div', 'materin-learn-viz__label', '尾巴决定开头：错 1 格会被钉回去滚成雪球（曝光偏差）'));
      } else {
        /* 延伸：窗口容量 vs 一圈注意力开销 */
        var bars3 = el('div', 'materin-learn-viz__bars');
        [
          { tag: '窗口 128K = 循环体一次能装多少', val: 100, cls: '', txt: '容量上限' },
          { tag: '缓存吃显存：越长越贵', val: 62, cls: ' materin-learn-viz__bar--en', txt: '转速 ↔ 可跑长度' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row');
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bars3.appendChild(row);
        });
        v.appendChild(bars3);
        v.appendChild(el('div', 'materin-learn-viz__label', '窗口管装多少，缓存管转多快——提示工程（D29 起）管喂什么'));
      }
    } else if (day.anim && day.anim.tpl === 'fim') {
      if (idx === 0) {
        /* 机制页：FIM 三段重排——训练时「前缀+后缀+中间」，光标就是切口 */
        var seq = el('div', 'materin-learn-viz__chips');
        [
          { tag: '前缀', cls: '' },
          { tag: '＋', cls: ' materin-learn-viz__chip--alt' },
          { tag: '后缀', cls: '' },
          { tag: '→', cls: ' materin-learn-viz__chip--alt' },
          { tag: '待补：中间', cls: ' materin-learn-viz__chip--merged' }
        ].forEach(function (r) {
          seq.appendChild(el('span', 'materin-learn-viz__chip' + r.cls, r.tag));
        });
        v.appendChild(seq);
        var fbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '光标前文（一次补全请求实际携带）', val: 100, cls: '', txt: '2000 token', wide: true },
          { tag: '光标后文（也能看见）', val: 25, cls: ' materin-learn-viz__bar--en', txt: '500 token', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          fbars.appendChild(row);
        });
        v.appendChild(fbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '补全 ≠ 续写：两头喂给 FIM，生成的位置在光标，不在文件尾'));
      } else if (idx === 1) {
        /* 为什么页：接受率与任务类型的分配账 */
        var abars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '常规代码（测试/样板/常见模式）', val: 55, cls: '', txt: '任务快 55%', wide: true },
          { tag: '私有业务逻辑（模型没见过的上下文）', val: 4, cls: ' materin-learn-viz__bar--en', txt: '提速趋近 0', wide: true },
          { tag: '端到端延迟上限（M 系列 p50）', val: 100, cls: '', txt: '305ms · 服务端 82ms', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          abars.appendChild(row);
        });
        v.appendChild(abars);
        v.appendChild(el('div', 'materin-learn-viz__label', '接受率是补全的计分板：短补全像递工具，长补全像让你做评审'));
      } else {
        /* 延伸页：三种姿态——谁按 Tab */
        var pbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '补全：你按 Tab', val: 30, cls: '', txt: '你是司机 · 逐字陪跑', wide: true },
          { tag: '聊天：它答你问', val: 62, cls: '', txt: '方向盘还在你手', wide: true },
          { tag: 'Agent：它按 Tab（D50 起）', val: 100, cls: ' materin-learn-viz__bar--en', txt: '你只在路口确认', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = r.val + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          pbars.appendChild(row);
        });
        v.appendChild(pbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '同一台发动机，三种姿态——提示工程（D29 起）管把需求喂给哪一种'));
      }
    } else if (day.anim && day.anim.tpl === 'think') {
      if (idx === 0) {
        /* 机制页：上下两栏对照——直接答（错）vs 思维链（回溯后对），与动效页同一叙事 */
        var pair = el('div', 'materin-learn-viz__routes');
        [
          { tag: '直接答：硬套 25+12=37', cls: '', verdict: '✗ 2ab 符号抄反', vcls: '' },
          { tag: '先想后答：写 (a+b)²=25 → 2ab=12 → a²+b²=25−12', cls: ' materin-learn-viz__route-row--think', verdict: '✓ =13，验算通过', vcls: ' materin-learn-viz__route-word--ok' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__route-row' + r.cls);
          row.appendChild(el('span', 'materin-learn-viz__route-word', r.tag));
          row.appendChild(el('span', 'materin-learn-viz__route-dot' + r.vcls, r.verdict));
          pair.appendChild(row);
        });
        v.appendChild(pair);
        v.appendChild(el('div', 'materin-learn-viz__label', '思维链没有新引擎：思考段也是 token，写出来的中间结果成为后面每一步的条件'));
      } else if (idx === 1) {
        /* 为什么页：token 与延迟的开销账 */
        var tbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '直接答：token 数', val: 2.5, cls: '', txt: '≈50 token · 2 秒', wide: true },
          { tag: '先想后答：token 数', val: 100, cls: '', txt: '≈2000 token · 30 秒', wide: true },
          { tag: 'KV cache 抵扣后延迟（D14）', val: 15, cls: ' materin-learn-viz__bar--en', txt: '只贵 ≈15 倍', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          tbars.appendChild(row);
        });
        v.appendChild(tbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '多想 40 倍只贵 15 倍——缓存让「深思」贵得可控，才敢做成开关'));
      } else {
        /* 延伸页：白嫖版 vs 训练版 + 按任务开档位 */
        var gbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '提示加「分步想」（2022 白嫖版）', val: 57, cls: '', txt: 'GSM8K 18→57%', wide: true },
          { tag: 'RL 训练版（o1，2024）', val: 83, cls: ' materin-learn-viz__bar--en', txt: 'AIME 13→83%', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, r.val) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          gbars.appendChild(row);
        });
        v.appendChild(gbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '档位按任务开：补全永远关，简单问答默认关，数学/调试/规划才全开'));
      }
    } else if (day.anim && day.anim.tpl === 'spec') {
      if (idx === 0) {
        /* 机制页：草稿行 → 验证行同位对照（4 收 1 重写），与动效页同一叙事 */
        var spair = el('div', 'materin-learn-viz__routes');
        [
          { tag: '草稿（1B 连吐 5 词）', cls: '', verdict: '待验证', vcls: '' },
          { tag: '验证（70B 一圈打分）：4 收 1 重写', cls: ' materin-learn-viz__route-row--think', verdict: '✓ 4/5', vcls: ' materin-learn-viz__route-word--ok' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__route-row' + r.cls);
          row.appendChild(el('span', 'materin-learn-viz__route-word', r.tag));
          row.appendChild(el('span', 'materin-learn-viz__route-dot' + r.vcls, r.verdict));
          spair.appendChild(row);
        });
        v.appendChild(spair);
        v.appendChild(el('div', 'materin-learn-viz__label', '被拒词按大模型自己的分布重抽——输出与不加速完全同分布'));
      } else if (idx === 1) {
        /* 为什么页：验收率决定收益 + 甜点区 */
        var sbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '逐词生成（无草稿）', val: 42, cls: '', txt: '21 token/秒', wide: true },
          { tag: '草稿 + 验证（α=0.75）', val: 100, cls: ' materin-learn-viz__bar--en', txt: '≈50 token/秒 · 2.4×', wide: true },
          { tag: 'K=8 的下场', val: 30, cls: '', txt: '尾部白验，反而更慢', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          sbars.appendChild(row);
        });
        v.appendChild(sbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '瓶颈是带宽不是算力：验证 K 个词 ≈ 自己写 1 个词，甜点区 K≈4~6'));
      } else {
        /* 延伸页：任务可预测性决定 α → 收益；Agent 场景的延迟账 */
        var xbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '代码改写（答案多抄自输入）', val: 100, cls: '', txt: 'α≈0.9 · 提速近 5×', wide: true },
          { tag: '开放创作', val: 32, cls: ' materin-learn-viz__bar--en', txt: 'α≈0.5~0.6 · 提速 1.5×', wide: true },
          { tag: 'Agent 任务 3000 token', val: 62, cls: '', txt: '143 秒 → 60 秒', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          xbars.appendChild(row);
        });
        v.appendChild(xbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '第 19 天多花算力买正确率，推测解码不多花一分买回时间——Agent 循环圈圈在攒'));
      }
    } else if (day.anim && day.anim.tpl === 'batch') {
      if (idx === 0) {
        /* 机制页：排队 lanes → 并批 lanes 同位对照，与动效页同一叙事 */
        var broutes = el('div', 'materin-learn-viz__routes');
        [
          { tag: '逐条处理：4 条请求排 4 段队', cls: '', verdict: 'GPU 空转 78%', vcls: '' },
          { tag: '连续批处理：4 条挤进同一批', cls: ' materin-learn-viz__route-row--think', verdict: '✓ 一列算 4 条', vcls: ' materin-learn-viz__route-word--ok' }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__route-row' + r.cls);
          row.appendChild(el('span', 'materin-learn-viz__route-word', r.tag));
          row.appendChild(el('span', 'materin-learn-viz__route-dot' + r.vcls, r.verdict));
          broutes.appendChild(row);
        });
        v.appendChild(broutes);
        v.appendChild(el('div', 'materin-learn-viz__label', '批内一次前向，4 条请求分摊同一遍权重搬运'));
      } else if (idx === 1) {
        /* 为什么页：到达率 × 批窗 = 吞吐；批次越大单价越低 */
        var bbars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '批 = 1（逐条独享）', val: 12, cls: '', txt: '最贵 · 一条独占整遍搬运', wide: true },
          { tag: '批 = 32', val: 55, cls: '', txt: '单价降到约 1/8', wide: true },
          { tag: '批 = 256（连续拼批）', val: 100, cls: ' materin-learn-viz__bar--en', txt: '单价约 1/20 · 队列不空批不散', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          bbars.appendChild(row);
        });
        v.appendChild(bbars);
        v.appendChild(el('div', 'materin-learn-viz__label', '权衡的是延迟：同批最慢的请求决定整批步速，批越大单步越慢'));
      } else {
        /* 延伸页：API 均价与吞吐的来源；你自己的部署也能开 */
        var ybars = el('div', 'materin-learn-viz__bars materin-learn-viz__bars--wide');
        [
          { tag: '自部署逐条处理', val: 20, cls: '', txt: '吞吐 21 token/秒 · 一条一条来', wide: true },
          { tag: '自部署连续批处理', val: 100, cls: ' materin-learn-viz__bar--en', txt: '吞吐 3~5 倍 · 队列不断批就不散', wide: true },
          { tag: '厂商 API 标价', val: 55, cls: '', txt: '输入价 = 批处理省下的搬运，明码标价', wide: true }
        ].forEach(function (r) {
          var row = el('div', 'materin-learn-viz__bar-row' + (r.wide ? ' materin-learn-viz__bar-row--wide' : ''));
          row.appendChild(el('span', 'materin-learn-viz__bar-tag', r.tag));
          var track = el('div', 'materin-learn-viz__bar-track');
          var bar = el('div', 'materin-learn-viz__bar' + r.cls);
          bar.style.width = Math.max(2, Math.min(100, r.val)) + '%';
          track.appendChild(bar);
          row.appendChild(track);
          row.appendChild(el('span', 'materin-learn-viz__bar-val', r.txt));
          ybars.appendChild(row);
        });
        v.appendChild(ybars);
        v.appendChild(el('div', 'materin-learn-viz__label', '第 16 天的圈是发动机，第 20 天的草稿省等待，批处理把不同用户的圈拼成一圈'));
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
        var colBox = text.getBoundingClientRect().bottom - top;
        for (var fs = 31; fs >= 16; fs -= 1.5) {
          parts.forEach(function (e) {
            e.style.fontSize = (e.classList.contains('materin-learn-quote') ? fs - 2 : fs) + 'px';
          });
          var b = bounds();
          /* 硬边界是文本列盒子本身（950）：内容超过列底就算溢出，990 只是页脚余量 */
          if (b[1] <= colBox && b[0] >= 190) break;
        }
      });
    });
  }

  if (qs('export')) document.body.classList.add('is-export');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
