/* days.json 加载器：同步注入 window.LEARN（learn.js 之前执行） */
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'days.json', false); // 同步：保证 boot 前数据就绪
  xhr.send(null);
  if (xhr.status === 200) {
    try { window.LEARN = JSON.parse(xhr.responseText); }
    catch (e) { console.error('days.json parse failed', e); }
  } else {
    console.error('days.json load failed', xhr.status);
  }
})();
