// ============================================================
// 智慧档案馆系统（全栈版）—— 前端逻辑
// 数据全部来自后端 REST API（fetch 异步），业务规则由后端执行
// 图表使用 ECharts，样式类名与 styles.css 对应
// ============================================================

// ---------- API 封装 ----------
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error) || '请求失败（' + res.status + '）');
  return data;
}

// ---------- 运行时状态 ----------
const state = {
  appraisalId: null,
  charts: {}
};

// ---------- 工具函数 ----------
function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'warn' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// 保管期限标签 class
function retClass(r) {
  if (r === '永久') return 'ret-permanent';
  if (r === '30年') return 'ret-30';
  return 'ret-10';
}

// 置信度等级
function confTier(c) {
  if (c >= 0.95) return { tag: 'tag-green', fill: 'high', text: '高' };
  if (c >= 0.85) return { tag: 'tag-amber', fill: 'mid', text: '中' };
  return { tag: 'tag-red', fill: 'low', text: '低' };
}

// 四性失败项（基于文件自带结果，用于初始展示）
function fourCheckFailed(file) {
  const c = file.fourCheck;
  const failed = [];
  if (!c.authenticity) failed.push('真实性');
  if (!c.completeness) failed.push('完整性');
  if (!c.usability) failed.push('可用性');
  if (!c.security) failed.push('安全性');
  return failed;
}

// ---------- ECharts 辅助 ----------
function makeChart(id, option) {
  const el = $(id);
  if (!el) return null;
  const chart = echarts.init(el);
  chart.setOption(option);
  state.charts[id] = chart;
  return chart;
}

// ============================================================
// 工作台
// ============================================================
async function renderDashboard() {
  const [stats, archived, intake] = await Promise.all([
    api('/stats'), api('/archives'), api('/intake')
  ]);
  const pending = intake.filter(f => f.status === 'pending');

  $('view-dashboard').innerHTML =
    '<div class="stat-grid">' +
      statCard('档案总量', stats.total, '件', '正式库现存档案', '', boxIcon('archive')) +
      statCard('永久保管', stats.permanent, '件', '核心档案', 'red', boxIcon('star')) +
      statCard('待鉴定', stats.pending, '件', '本期待处理文件', 'amber', boxIcon('clock')) +
      statCard('借阅中', stats.borrowing, '件', '未归还档案', 'green', boxIcon('loan')) +
    '</div>' +
    '<div class="grid-2-1">' +
      '<div class="card"><div class="card-head"><div class="card-title">档案数量趋势</div>' +
        '<span class="muted">近 6 个月</span></div><div class="chart-box" id="chart-trend"></div></div>' +
      '<div class="card"><div class="card-head"><div class="card-title">待办事项</div>' +
        '<span class="muted">' + pending.length + ' 项</span></div><div class="todo-list">' + todoList(pending) + '</div></div>' +
    '</div>' +
    '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><div class="card-title">档案门类分布</div></div>' +
        '<div class="chart-box" id="chart-category"></div></div>' +
      '<div class="card"><div class="card-head"><div class="card-title">保管期限分布</div></div>' +
        '<div class="chart-box" id="chart-retention"></div></div>' +
    '</div>';

  drawDashboardCharts(archived);
}

function boxIcon(type) {
  const base = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
    star: '<polygon points="12 3 15 9 21 9.5 16.5 14 18 20 12 17 6 20 7.5 14 3 9.5 9 9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    loan: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><polyline points="21 3 21 8 16 8"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="3 21 3 16 8 16"/>'
  };
  return '<svg viewBox="0 0 24 24" ' + base + '>' + paths[type] + '</svg>';
}

function statCard(label, num, unit, sub, mod, icon) {
  return '<div class="stat-card ' + mod + '"><div class="stat-top"><span class="stat-label">' + label +
    '</span><div class="stat-icon">' + icon + '</div></div><div class="stat-num">' + num +
    '<span class="stat-unit">' + unit + '</span></div><div class="stat-trend">' + esc(sub) + '</div></div>';
}

function todoList(pending) {
  if (!pending.length) return '<div class="empty-state"><div class="empty-text">暂无待办事项</div></div>';
  return pending.map(f =>
    '<div class="todo-item"><span class="todo-dot amber"></span>' +
      '<span class="todo-text">' + esc(f.title) + '</span>' +
      '<span class="todo-time">' + esc(f.date) + '</span></div>'
  ).join('');
}

function drawDashboardCharts(archived) {
  const ink = '#1f3a5f';
  const palette = ['#1f3a5f', '#5b7a99', '#b03a2e', '#2f6b4f', '#b07d24', '#8a6d9a'];

  makeChart('chart-trend', {
    color: [ink],
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: ['6月', '7月', '8月', '9月', '10月', '11月'],
      axisLine: { lineStyle: { color: '#cbd3dd' } } },
    yAxis: { type: 'value', beginAtZero: true, splitLine: { lineStyle: { color: '#eef1f5' } } },
    series: [{ type: 'line', smooth: true, data: [12, 18, 9, 22, 16, 14],
      areaStyle: { color: 'rgba(31,58,95,0.10)' }, lineStyle: { width: 2 }, symbolSize: 7 }]
  });

  const cat = {};
  archived.forEach(f => { cat[f.subject] = (cat[f.subject] || 0) + 1; });
  makeChart('chart-category', {
    color: palette,
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
      data: Object.keys(cat).map(k => ({ name: k, value: cat[k] })),
      label: { show: false }, labelLine: { show: false } }]
  });

  const ret = {};
  archived.forEach(f => { ret[f.retention] = (ret[f.retention] || 0) + 1; });
  makeChart('chart-retention', {
    color: ['#1f3a5f', '#5b7a99', '#b07d24'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [{ type: 'pie', radius: '66%', center: ['50%', '44%'],
      data: Object.keys(ret).map(k => ({ name: k, value: ret[k] })) }]
  });
}

// ============================================================
// 档案接收
// ============================================================
async function renderIntake() {
  const list = await api('/intake');
  $('view-intake').innerHTML =
    '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>文件编号</th><th>文件题名</th><th>责任部门</th><th>文种</th><th>成文日期</th>' +
      '<th>密级</th><th>来源</th><th>四性检测</th><th>状态</th></tr></thead><tbody>' +
    list.map(f =>
      '<tr><td class="center" style="white-space:nowrap">' + esc(f.id) + '</td>' +
        '<td><div class="cell-title">' + esc(f.title) + '</div>' +
          '<div class="cell-sub">' + esc(f.docNo) + '</div></td>' +
        '<td>' + esc(f.department) + '</td><td>' + esc(f.docType) + '</td><td>' + esc(f.date) + '</td>' +
        '<td>' + esc(f.security) + '</td><td><span class="tag tag-grey">' + esc(f.source) + '</span></td>' +
        '<td>' + fourCheckTags(f) + '</td><td>' + statusTag(f.status) + '</td></tr>'
    ).join('') +
    '</tbody></table></div>';
}

const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>';

function fourCheckTags(f) {
  const c = f.fourCheck;
  return [['真', c.authenticity], ['整', c.completeness], ['用', c.usability], ['安', c.security]].map(([n, ok]) =>
    '<span class="tag ' + (ok ? 'tag-green' : 'tag-red') + '">' + n + '</span>'
  ).join(' ');
}

function statusTag(s) {
  const map = {
    pending: '<span class="tag tag-amber">待鉴定</span>',
    archived: '<span class="tag tag-blue">已归档</span>',
    returned: '<span class="tag tag-red">已退回</span>'
  };
  return map[s] || esc(s);
}

// ============================================================
// 智能鉴定
// ============================================================
async function renderAppraisal() {
  const list = await api('/intake');
  if (!state.appraisalId || !list.some(f => f.id === state.appraisalId)) {
    state.appraisalId = list.length ? list[0].id : null;
  }

  $('view-appraisal').innerHTML =
    '<div class="toolbar"><span class="muted">选择待鉴定文件：</span>' +
      '<select class="filter-select" id="appraisal-select">' +
        list.map(f => '<option value="' + esc(f.id) + '"' + (f.id === state.appraisalId ? ' selected' : '') +
          '>' + esc(f.id) + ' · ' + esc(f.title) + '</option>').join('') +
      '</select></div>' +
    '<div id="appraisal-slot">' + (state.appraisalId ? appraisalFlow(list.find(f => f.id === state.appraisalId)) :
      '<div class="empty-state"><div class="empty-text">暂无文件</div></div>') + '</div>';

  $('appraisal-select').addEventListener('change', e => {
    state.appraisalId = e.target.value;
    renderAppraisal();
  });
}

function appraisalFlow(f) {
  const failed = fourCheckFailed(f);
  return '<div class="appraisal-flow">' +
    '<div class="flow-step"><div class="flow-num">1</div><div class="flow-body">' +
      '<div class="flow-title">文件信息</div>' +
      '<div class="desc-list">' +
        descRow('文件编号', f.id) + descRow('发文字号', f.docNo) +
        descRow('文件题名', f.title) + descRow('责任部门', f.department) +
        descRow('文种', f.docType) + descRow('事由类别', f.subject) +
        descRow('成文日期', f.date) + descRow('密级', f.security) +
      '</div></div></div>' +
    '<div class="flow-step"><div class="flow-num ' + (failed.length ? 'warn' : 'done') + '"></div><div class="flow-body">' +
      '<div class="flow-title">四性检测</div>' +
      '<div class="check-grid">' + checkItems(f) + '</div></div></div>' +
    '<div class="flow-step"><div class="flow-num">3</div><div class="flow-body">' +
      '<div class="flow-title">规则匹配</div><div id="rule-result">' +
        '<div class="empty-state"><div class="empty-text">尚未运行鉴定</div></div>' +
      '</div></div></div>' +
    '<div class="flow-step"><div class="flow-num">4</div><div class="flow-body">' +
      '<div class="flow-title">鉴定操作</div>' +
      '<div class="flex-between" id="action-slot">' +
        '<button class="btn btn-primary" data-action="run" data-id="' + esc(f.id) + '">运行自动鉴定</button>' +
      '</div></div></div>' +
  '</div>';
}

function descRow(key, val) {
  return '<div class="desc-row"><div class="desc-key">' + esc(key) + '</div>' +
    '<div class="desc-val">' + esc(val) + '</div></div>';
}

function checkItems(f) {
  const c = f.fourCheck;
  const detail = {
    authenticity: '电子签章与元数据校验',
    completeness: '组件与著录项完整性',
    usability: '格式可解析、可正常读取',
    security: '安全标记与病毒检测'
  };
  return [['真实性', c.authenticity, detail.authenticity],
    ['完整性', c.completeness, detail.completeness],
    ['可用性', c.usability, detail.usability],
    ['安全性', c.security, detail.security]].map(([name, ok, d]) =>
    '<div class="check-item"><div class="check-status ' + (ok ? 'pass' : 'fail') + '">' + (ok ? '✓' : '✕') +
      '</div><div><div class="check-name">' + name + '</div>' +
      '<div class="check-detail">' + d + (ok ? '通过' : '未通过') + '</div></div></div>'
  ).join('');
}

// 运行鉴定：调用后端
async function runAppraisal(id) {
  const result = await api('/appraisal/' + id + '/run', { method: 'POST' });
  renderRuleResult(id, result);
}

function renderRuleResult(id, result) {
  const slot = $('rule-result');
  const action = $('action-slot');
  if (!slot) return;

  if (result.fourCheckFailed.length) {
    slot.innerHTML = '<div class="result-box mid"><div class="result-meta">' +
        '<span class="tag tag-red">四性未通过</span></div>' +
        '<div class="result-reason">未通过项目：' + esc(result.fourCheckFailed.join('、')) +
        '，建议退回业务部门补正后再移交。</div></div>';
    action.innerHTML = runBtn(id) + returnBtn(id);
    return;
  }
  if (!result.rule) {
    slot.innerHTML = '<div class="result-box mid"><div class="result-meta">' +
        '<span class="tag tag-red">规则未命中</span></div>' +
        '<div class="result-reason">现有规则库未匹配到适用条款，建议人工复核或补充规则。</div></div>';
    action.innerHTML = runBtn(id) + returnBtn(id);
    return;
  }
  const r = result.rule;
  slot.innerHTML = '<div class="result-box high"><div class="result-meta">' +
      '<span class="tag tag-green">命中 ' + esc(r.id) + '</span>' +
      '<span class="retention-tag ' + retClass(r.retention) + '">' + esc(r.retention) + '</span>' +
      '<span class="result-clause">' + esc(r.clause) + '</span></div>' +
      '<div class="confidence-row"><div class="confidence-bar"><div class="confidence-fill ' +
        confTier(r.confidence).fill + '" style="width:' + Math.round(r.confidence * 100) + '%"></div></div>' +
        '<div class="confidence-val">' + r.confidence.toFixed(2) + '</div></div>' +
      '<div class="result-reason">' + esc(r.reason) + '</div></div>';
  action.innerHTML = runBtn(id) +
    '<button class="btn btn-primary" data-action="archive" data-id="' + esc(id) + '">确认归档</button>' +
    returnBtn(id);
}

function runBtn(id) {
  return '<button class="btn btn-outline" data-action="run" data-id="' + esc(id) + '">重新鉴定</button>';
}
function returnBtn(id) {
  return '<button class="btn btn-danger" data-action="return-file" data-id="' + esc(id) + '">退回文件</button>';
}

// ============================================================
// 档案管理
// ============================================================
async function renderArchives() {
  const list = await api('/archives');
  $('view-archives').innerHTML =
    '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>档号</th><th>档案题名</th><th>文种</th><th>事由</th><th>保管期限</th>' +
      '<th>置信度</th><th>归档日期</th><th>操作</th></tr></thead><tbody>' +
    list.map(f => {
      const tier = confTier(f.confidence);
      return '<tr><td style="white-space:nowrap">' + esc(f.archiveNo) + '</td>' +
        '<td><div class="cell-title">' + esc(f.title) + '</div>' +
          '<div class="cell-sub">' + esc(f.docNo) + '</div></td>' +
        '<td>' + esc(f.docType) + '</td><td>' + esc(f.subject) + '</td>' +
        '<td><span class="retention-tag ' + retClass(f.retention) + '">' + esc(f.retention) + '</span></td>' +
        '<td><span class="tag ' + tier.tag + '">' + tier.text + ' ' + f.confidence.toFixed(2) + '</span></td>' +
        '<td>' + esc(f.archiveDate) + '</td>' +
        '<td><button class="btn btn-sm btn-outline" data-action="borrow" data-id="' + esc(f.id) + '">借阅</button></td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

// ============================================================
// 检索利用
// ============================================================
async function renderSearch() {
  $('view-search').innerHTML =
    '<div class="toolbar"><div class="search-input">' + searchIcon +
      '<input type="text" id="search-input" placeholder="搜索档案"></div>' +
      '<select class="filter-select" id="search-retention"><option value="all">全部期限</option>' +
        '<option value="永久">永久</option><option value="30年">30年</option><option value="10年">10年</option></select>' +
      '<button class="btn btn-primary" id="search-btn">检索</button></div>' +
    '<div id="search-results"><div class="empty-state"><div class="empty-text">输入关键词开始检索</div></div></div>';

  let timer = null;
  const input = $('search-input');
  $('search-input').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(doSearch, 300); });
  $('search-retention').addEventListener('change', doSearch);
  $('search-btn').addEventListener('click', doSearch);
}

async function doSearch() {
  const kw = $('search-input').value.trim();
  const retention = $('search-retention').value;
  const list = await api('/archives?keyword=' + encodeURIComponent(kw) +
    '&retention=' + encodeURIComponent(retention));
  const slot = $('search-results');
  if (!list.length) {
    slot.innerHTML = '<div class="empty-state"><div class="empty-text">未检索到符合条件的档案</div></div>';
    return;
  }
  slot.innerHTML = '<div class="muted" style="margin-bottom:12px">共检索到 ' + list.length + ' 条档案</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>档号</th><th>档案题名</th>' +
      '<th>责任部门</th><th>保管期限</th><th>置信度</th><th>操作</th></tr></thead><tbody>' +
    list.map(f =>
      '<tr><td style="white-space:nowrap">' + esc(f.archiveNo) + '</td>' +
        '<td><div class="cell-title">' + esc(f.title) + '</div></td>' +
        '<td>' + esc(f.department) + '</td>' +
        '<td><span class="retention-tag ' + retClass(f.retention) + '">' + esc(f.retention) + '</span></td>' +
        '<td>' + f.confidence.toFixed(2) + '</td>' +
        '<td><button class="btn btn-sm btn-outline" data-action="borrow" data-id="' + esc(f.id) + '">申请借阅</button></td></tr>'
    ).join('') + '</tbody></table></div>';
}

// ============================================================
// 动作：归档 / 退回 / 借阅
// ============================================================
async function callArchive(id) {
  const record = await api('/intake/' + id + '/archive', { method: 'POST' });
  state.appraisalId = null;
  await refreshBadge();
  await renderAppraisal();
  showToast('已归档，档号：' + record.archiveNo, 'success');
}

async function callReturn(id) {
  await api('/intake/' + id + '/return', { method: 'POST' });
  state.appraisalId = null;
  await refreshBadge();
  await renderAppraisal();
  showToast('文件已退回业务部门', 'info');
}

async function callBorrow(id) {
  const loan = await api('/archives/' + id + '/borrow', { method: 'POST' });
  if ($('view-search').classList.contains('active')) await doSearch();
  else await renderArchives();
  showToast('借阅申请成功，应还日期 ' + loan.dueDate, 'success');
}

// ---------- 角标 ----------
async function refreshBadge() {
  try {
    const stats = await api('/stats');
    $('intake-badge').textContent = stats.pending;
  } catch {}
}

// ============================================================
// 路由
// ============================================================
async function switchRoute(name) {
  const meta = {
    dashboard: ['工作台', '首页 / 工作台'],
    intake: ['档案接收', '业务管理 / 档案接收'],
    appraisal: ['智能鉴定', '业务管理 / 智能鉴定'],
    archives: ['档案管理', '业务管理 / 档案管理'],
    search: ['检索利用', '业务管理 / 检索利用']
  }[name];
  if (meta) {
    $('page-title').textContent = meta[0];
    $('page-crumb').textContent = meta[1];
  }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === name));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view-' + name).classList.add('active');
  Object.values(state.charts).forEach(c => { try { c.dispose(); } catch {} });
  state.charts = {};
  try {
    if (name === 'dashboard') await renderDashboard();
    if (name === 'intake') await renderIntake();
    if (name === 'appraisal') await renderAppraisal();
    if (name === 'archives') await renderArchives();
    if (name === 'search') await renderSearch();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---------- 事件委托 ----------
document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  try {
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'run') await runAppraisal(id);
    if (action === 'archive') await callArchive(id);
    if (action === 'return-file') await callReturn(id);
    if (action === 'borrow') await callBorrow(id);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', e => {
    e.preventDefault();
    switchRoute(n.dataset.route);
  });
});

window.addEventListener('resize', () => {
  Object.values(state.charts).forEach(c => { try { c.resize(); } catch {} });
});

// ---------- 启动 ----------
(async function init() {
  await refreshBadge();
  await switchRoute('dashboard');
})();
