/* ============================================================
   智慧档案馆系统 —— 核心逻辑
   路由 / 规则引擎 / 视图渲染 / 智能鉴定交互
   ============================================================ */

// ---------- 运行时状态（深拷贝，鉴定后可变化） ----------
const state = {
  intake: JSON.parse(JSON.stringify(INTAKE_FILES)),
  archived: JSON.parse(JSON.stringify(ARCHIVED_FILES)),
  loans: JSON.parse(JSON.stringify(LOAN_RECORDS)),
  appraisalId: null,
  charts: {}
};

const PAGE_META = {
  dashboard: { title: '工作台', crumb: '首页 / 工作台' },
  intake: { title: '档案接收', crumb: '首页 / 档案接收' },
  appraisal: { title: '智能鉴定', crumb: '首页 / 智能鉴定' },
  archives: { title: '档案管理', crumb: '首页 / 档案管理' },
  search: { title: '检索利用', crumb: '首页 / 检索利用' }
};

// ---------- 工具函数 ----------
function $(sel) { return document.querySelector(sel); }

function showToast(msg, type) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(function () { t.className = 'toast'; }, 2600);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function retentionClass(r) {
  if (r === '永久') return 'ret-permanent';
  if (r === '30年') return 'ret-30';
  return 'ret-10';
}

function confidenceLevel(c) {
  if (c >= 0.9) return { name: 'high', text: '高置信度', tag: 'tag-green' };
  if (c >= 0.6) return { name: 'mid', text: '中置信度', tag: 'tag-amber' };
  return { name: 'low', text: '低置信度', tag: 'tag-red' };
}

// ---------- 规则引擎（对应第七次作业模块三） ----------
function matchRule(file) {
  for (let i = 0; i < RETENTION_RULES.length; i++) {
    const rule = RETENTION_RULES[i];
    let ok = true;
    const keys = Object.keys(rule.conditions);
    for (let j = 0; j < keys.length; j++) {
      if (file[keys[j]] !== rule.conditions[keys[j]]) { ok = false; break; }
    }
    if (ok) return rule;
  }
  return null;
}

// 四性检测结果（对应模块六）
function fourCheckFailed(file) {
  const c = file.fourCheck;
  const failed = [];
  if (!c.authenticity) failed.push('真实性');
  if (!c.completeness) failed.push('完整性');
  if (!c.usability) failed.push('可用性');
  if (!c.security) failed.push('安全性');
  return failed;
}

function genArchiveNo(retention, date) {
  const year = date.slice(0, 4);
  const seq = state.archived.length + 1;
  return '办-' + year + '-' + retention + '-' + String(seq).padStart(3, '0');
}

// ============================================================
//  视图一：工作台
// ============================================================
function renderDashboard() {
  const total = state.archived.length;
  const permanent = state.archived.filter(function (f) { return f.retention === '永久'; }).length;
  const pending = state.intake.filter(function (f) { return f.status === 'pending'; }).length;
  const borrowing = state.loans.filter(function (l) { return l.status === '借阅中'; }).length;

  const html =
    '<div class="stat-grid">' +
      statCard('', '在馆档案总量', total, '件', '蓝', '较上月 <span class="up">+6.2%</span>') +
      statCard('red', '待鉴定文件', pending, '件', '红', '需在本周内完成鉴定') +
      statCard('green', '永久保存档案', permanent, '件', '绿', '核心职能凭证') +
      statCard('amber', '档案借阅中', borrowing, '件', '琥珀', '含 2 件临近到期') +
    '</div>' +

    '<div class="grid-2-1">' +
      '<div class="card"><div class="card-head"><div class="card-title">近半年归档数量趋势</div></div><div class="chart-box" id="chart-trend"></div></div>' +
      '<div class="card"><div class="card-head"><div class="card-title">待办事项</div></div>' + todoList() + '</div>' +
    '</div>' +

    '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><div class="card-title">档案门类分布</div></div><div class="chart-box" id="chart-subject"></div></div>' +
      '<div class="card"><div class="card-head"><div class="card-title">保管期限分布</div></div><div class="chart-box" id="chart-retention"></div></div>' +
    '</div>';

  $('#view-dashboard').innerHTML = html;
  setTimeout(initDashboardCharts, 30);
}

function statCard(color, label, num, unit, icon, trend) {
  const icons = {
    '蓝': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    '红': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    '绿': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    '琥珀': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };
  return '<div class="stat-card ' + color + '">' +
    '<div class="stat-top"><div class="stat-label">' + label + '</div>' +
    '<div class="stat-icon">' + icons[icon] + '</div></div>' +
    '<div class="stat-num">' + num + '<span class="stat-unit">' + unit + '</span></div>' +
    '<div class="stat-trend">' + trend + '</div></div>';
}

function todoList() {
  const items = [
    { dot: 'var(--seal-red)', text: '完成 8 份预归档文件的自动鉴定', time: '今天', route: 'appraisal' },
    { dot: 'var(--amber)', text: '复核涉密会议纪要的开放审核', time: '明天', route: 'appraisal' },
    { dot: 'var(--green)', text: '处理 2 件档案借阅到期提醒', time: '本周五', route: 'search' },
    { dot: 'var(--blue-grey)', text: '更新保管期限规则库（季度）', time: '下周一', route: 'appraisal' }
  ];
  return '<div class="todo-list">' + items.map(function (it) {
    return '<div class="todo-item" data-action="go" data-route="' + it.route + '">' +
      '<span class="todo-dot" style="background:' + it.dot + '"></span>' +
      '<span class="todo-text">' + it.text + '</span>' +
      '<span class="todo-time">' + it.time + '</span></div>';
  }).join('') + '</div>';
}

function initDashboardCharts() {
  if (typeof echarts === 'undefined') {
    ['chart-trend', 'chart-subject', 'chart-retention'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="empty-state"><div class="empty-text">图表组件需联网加载，当前为离线状态</div></div>';
    });
    return;
  }
  const axisFont = { fontFamily: 'Noto Sans SC', color: '#7c8898' };

  // 趋势折线
  const c1 = echarts.init($('#chart-trend'));
  c1.setOption({
    tooltip: { trigger: 'axis', confine: true },
    grid: { left: 40, right: 20, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: ['6月', '7月', '8月', '9月', '10月', '11月'], axisLine: { lineStyle: { color: '#e2e7ee' } }, axisLabel: axisFont },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef1f5' } }, axisLabel: axisFont },
    series: [{
      data: [12, 18, 9, 22, 16, 14],
      type: 'line', smooth: true,
      lineStyle: { color: '#1f3a5f', width: 2.5 },
      itemStyle: { color: '#1f3a5f' },
      areaStyle: { color: '#e9eef4' }
    }]
  });

  // 门类分布（从归档数据真实统计）
  const subjCount = {};
  state.archived.forEach(function (f) { subjCount[f.subject] = (subjCount[f.subject] || 0) + 1; });
  const palette = ['#1f3a5f', '#5b7a99', '#2f6b4f', '#b07d24', '#b03a2e'];
  const c2 = echarts.init($('#chart-subject'));
  c2.setOption({
    tooltip: { trigger: 'item', confine: true, formatter: '{b}: {c} 件 ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#4a5768', fontSize: 12 } },
    color: palette,
    series: [{
      type: 'pie', radius: ['42%', '66%'], center: ['50%', '44%'],
      label: { formatter: function (p) { return p.name + ' ' + p.percent + '%'; }, fontSize: 11 },
      data: Object.keys(subjCount).map(function (k) { return { name: k, value: subjCount[k] }; })
    }]
  });

  // 保管期限分布
  const retCount = { '永久': 0, '30年': 0, '10年': 0 };
  state.archived.forEach(function (f) { retCount[f.retention]++; });
  const c3 = echarts.init($('#chart-retention'));
  c3.setOption({
    tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 20, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: ['永久', '30年', '10年'], axisLine: { lineStyle: { color: '#e2e7ee' } }, axisLabel: axisFont },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef1f5' } }, axisLabel: axisFont, minInterval: 1 },
    series: [{
      type: 'bar', barWidth: '46%',
      data: [
        { value: retCount['永久'], itemStyle: { color: '#1f3a5f' } },
        { value: retCount['30年'], itemStyle: { color: '#5b7a99' } },
        { value: retCount['10年'], itemStyle: { color: '#b07d24' } }
      ]
    }]
  });

  state.charts = { c1: c1, c2: c2, c3: c3 };
  [c1, c2, c3].forEach(function (c) {
    new ResizeObserver(function () { c.resize(); }).observe(c.getDom());
  });
}

// ============================================================
//  视图二：档案接收（预归档）
// ============================================================
function renderIntake() {
  const rows = state.intake.map(function (f) {
    const failed = fourCheckFailed(f);
    const checkTag = failed.length === 0
      ? '<span class="tag tag-green">四性通过</span>'
      : '<span class="tag tag-red">' + failed.join('、') + '异常</span>';
    const statusTag = f.status === 'pending'
      ? '<span class="tag tag-amber">待鉴定</span>'
      : '<span class="tag tag-blue">已处理</span>';
    return '<tr>' +
      '<td><div class="cell-title">' + esc(f.title) + '</div><div class="cell-sub">' + esc(f.docNo) + '</div></td>' +
      '<td>' + esc(f.department) + '</td>' +
      '<td>' + esc(f.docType) + '</td>' +
      '<td>' + esc(f.subject) + '</td>' +
      '<td>' + esc(f.date) + '</td>' +
      '<td class="center">' + checkTag + '</td>' +
      '<td class="center">' + statusTag + '</td>' +
      '<td class="center"><button class="btn btn-primary btn-sm" data-action="to-appraisal" data-id="' + f.id + '">去鉴定</button></td>' +
    '</tr>';
  }).join('');

  const html =
    '<div class="card">' +
      '<div class="card-head"><div class="card-title">预归档文件清单</div><span class="more">来源：OA系统 / 业务系统自动捕获</span></div>' +
      '<div class="muted" style="margin-bottom:14px">文件办结时由系统自动捕获正本及元数据，进入预归档池等待鉴定。共 ' + state.intake.length + ' 份。</div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>文件题名 / 发文字号</th><th>责任部门</th><th>文种</th><th>事由</th><th>成文日期</th>' +
        '<th class="center">四性检测</th><th class="center">状态</th><th class="center">操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
  $('#view-intake').innerHTML = html;
}

// ============================================================
//  视图三：智能鉴定（核心）
// ============================================================
function renderAppraisal() {
  const pending = state.intake.filter(function (f) { return f.status === 'pending'; });
  if (!state.appraisalId || !state.intake.find(function (f) { return f.id === state.appraisalId; })) {
    state.appraisalId = pending.length ? pending[0].id : (state.intake[0] && state.intake[0].id);
  }
  const file = state.intake.find(function (f) { return f.id === state.appraisalId; });

  // 左侧待鉴定列表
  const listHtml = state.intake.map(function (f) {
    const failed = fourCheckFailed(f);
    const dot = failed.length ? 'var(--seal-red)' : (f.status === 'pending' ? 'var(--amber)' : 'var(--green)');
    return '<div class="todo-item ' + (f.id === state.appraisalId ? 'active' : '') + '" style="' + (f.id === state.appraisalId ? 'background:#eef1f5' : '') + '" data-action="pick" data-id="' + f.id + '">' +
      '<span class="todo-dot" style="background:' + dot + '"></span>' +
      '<span class="todo-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(f.title) + '</span>' +
    '</div>';
  }).join('');

  const html =
    '<div style="display:grid;grid-template-columns:300px 1fr;gap:18px;align-items:start">' +
      '<div class="card"><div class="card-head"><div class="card-title">鉴定队列</div></div><div class="todo-list">' + listHtml + '</div></div>' +
      '<div id="appraisal-detail">' + (file ? appraisalDetail(file) : '') + '</div>' +
    '</div>';
  $('#view-appraisal').innerHTML = html;
}

function appraisalDetail(file) {
  const failed = fourCheckFailed(file);
  const fourHtml = fourCheckItems(file);

  let actionHtml = '';
  if (failed.length > 0) {
    // 四性不通过 → 打回
    actionHtml =
      '<div class="result-box mid" style="border-left-color:var(--seal-red)">' +
        '<div class="result-meta"><span class="tag tag-red">四性检测不通过</span></div>' +
        '<div class="result-reason">未通过检测项：<b>' + failed.join('、') + '</b>。该文件不具备归档条件，系统将自动打回责任部门补充元数据或重新制作，档案员不做价值鉴定。</div>' +
      '</div>' +
      '<div class="mt-2"><button class="btn btn-danger" data-action="return-file" data-id="' + file.id + '">打回责任部门</button></div>';
  } else if (file.status !== 'pending') {
    actionHtml = '<div class="empty-state"><div class="empty-text">该文件已完成鉴定并归档，可在档案管理中查看。</div></div>';
  } else {
    // 初始不自动运行，待点击“运行自动鉴定”
    actionHtml = '';
  }

  return '<div class="card">' +
    '<div class="card-head"><div class="card-title">文件鉴定</div></div>' +
    '<div class="desc-list" style="grid-template-columns:1fr 1fr">' +
      descRow('文件题名', file.title) + descRow('发文字号', file.docNo) +
      descRow('责任部门', file.department) + descRow('文种', file.docType) +
      descRow('事由类别', file.subject) + descRow('密级', file.security) +
    '</div>' +

    '<div class="mt-2"><div class="card-title" style="font-size:14px;margin-bottom:12px">第一步：四性自动检测</div>' +
      '<div class="check-grid">' + fourHtml + '</div></div>' +

    '<div class="mt-2"><div class="flex-between" style="margin-bottom:12px"><div class="card-title" style="font-size:14px">第二步：保管期限自动鉴定</div>' +
      '<button class="btn btn-primary btn-sm" data-action="run" data-id="' + file.id + '">运行自动鉴定</button></div>' +
      '<div id="rule-result"><div class="muted">点击“运行自动鉴定”，规则引擎将依据保管期限规则库给出判定。</div></div>' +
    '</div>' +
    '<div id="action-slot" style="display:' + (failed.length > 0 || file.status !== 'pending' ? 'block' : 'none') + '">' + actionHtml + '</div>' +
  '</div>';
}

function fourCheckItems(file) {
  const c = file.fourCheck;
  const items = [
    { name: '真实性', detail: '电子签名 / 时间戳 / Hash校验', pass: c.authenticity },
    { name: '完整性', detail: '文件数量 / 元数据项齐全性', pass: c.completeness },
    { name: '可用性', detail: '格式合规 / 载体可读 / 病毒扫描', pass: c.usability },
    { name: '安全性', detail: '密级标识 / 敏感词检测', pass: c.security }
  ];
  return items.map(function (it) {
    const icon = it.pass
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    return '<div class="check-item"><div class="check-status ' + (it.pass ? 'pass' : 'fail') + '">' + icon + '</div>' +
      '<div><div class="check-name">' + it.name + '</div><div class="check-detail">' + it.detail + '</div></div></div>';
  }).join('');
}

function descRow(key, val) {
  return '<div class="desc-row"><span class="desc-key">' + key + '</span><span class="desc-val">' + esc(val) + '</span></div>';
}

function ruleResult(file, rule) {
  if (!rule) {
    return '<div class="result-box mid"><div class="result-reason">规则库未命中，需转入语义辅助鉴定（后续阶段接入大模型）。</div></div>';
  }
  const lvl = confidenceLevel(rule.confidence);
  const pct = Math.round(rule.confidence * 100);
  const btnLabel = lvl.name === 'high' ? '确认归档（高置信度）' : '人工复核通过并归档';
  const btnClass = lvl.name === 'high' ? 'btn-primary' : 'btn-danger';

  // 写入结果区
  setTimeout(function () {
    const rr = $('#rule-result');
    if (rr) {
      rr.innerHTML =
        '<div class="result-box ' + lvl.name + '">' +
          '<div class="result-meta">' +
            '<span class="retention-tag ' + retentionClass(rule.retention) + '">保管期限：' + rule.retention + '</span>' +
            '<span class="tag ' + lvl.tag + '">' + lvl.text + '</span>' +
            '<span class="result-clause">命中 ' + rule.clause + '（规则 ' + rule.id + '）</span>' +
          '</div>' +
          '<div class="confidence-row"><div class="confidence-bar"><div class="confidence-fill ' + lvl.name + '" style="width:' + pct + '%"></div></div><div class="confidence-val">' + pct + '%</div></div>' +
          '<div class="result-reason">' + esc(rule.reason) + '</div>' +
        '</div>';
      const slot = $('#action-slot');
      if (slot) {
        slot.style.display = 'block';
        slot.innerHTML =
          '<div class="muted" style="margin-bottom:10px">' +
            (lvl.name === 'high' ? '规则直接命中，可由系统自动归档，档案员事后抽样审计。' : '中置信度结论，档案员须核对判定理由后签字确认，防止自动化偏误。') +
          '</div>' +
          '<button class="btn ' + btnClass + '" data-action="archive" data-id="' + file.id + '">' + btnLabel + '</button> ' +
          '<button class="btn btn-outline" data-action="return-file" data-id="' + file.id + '">打回补录</button>';
      }
    }
  }, 30);
  return '';
}

// 执行归档：从预归档移入正式库
function doArchive(fileId) {
  const file = state.intake.find(function (f) { return f.id === fileId; });
  const rule = matchRule(file);
  const record = {
    id: 'ARC-' + fileId,
    archiveNo: genArchiveNo(rule.retention, file.date),
    title: file.title, docNo: file.docNo, department: file.department,
    docType: file.docType, subject: file.subject, date: file.date,
    security: file.security, retention: rule.retention,
    confidence: rule.confidence, ruleRef: rule.id, clause: rule.clause,
    archiveDate: new Date().toISOString().slice(0, 10), status: 'archived'
  };
  state.archived.push(record);
  file.status = 'archived';
  state.appraisalId = null;
  updateBadge();
  renderAppraisal();
  showToast('已归档，档号：' + record.archiveNo, 'success');
}

function doReturn(fileId) {
  const file = state.intake.find(function (f) { return f.id === fileId; });
  file.status = 'returned';
  state.appraisalId = null;
  updateBadge();
  renderAppraisal();
  showToast('已打回责任部门补录', 'warn');
}

// ============================================================
//  视图四：档案管理
// ============================================================
function renderArchives() {
  const rows = state.archived.map(function (f) {
    return '<tr>' +
      '<td class="center"><span class="retention-tag ' + retentionClass(f.retention) + '">' + f.retention + '</span></td>' +
      '<td><div class="cell-title">' + esc(f.title) + '</div><div class="cell-sub">' + esc(f.archiveNo) + '</div></td>' +
      '<td>' + esc(f.docNo) + '</td>' +
      '<td>' + esc(f.department) + '</td>' +
      '<td>' + esc(f.subject) + '</td>' +
      '<td class="center">' + Math.round(f.confidence * 100) + '%</td>' +
      '<td>' + esc(f.archiveDate) + '</td>' +
      '<td class="center"><button class="btn btn-outline btn-sm" data-action="detail" data-id="' + f.id + '">查看详情</button></td>' +
    '</tr>';
  }).join('');

  const html =
    '<div class="card">' +
      '<div class="card-head"><div class="card-title">正式档案库</div><span class="more">共 ' + state.archived.length + ' 件</span></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th class="center">保管期限</th><th>档案题名 / 档号</th><th>发文字号</th><th>责任部门</th><th>事由</th>' +
        '<th class="center">鉴定置信度</th><th>归档日期</th><th class="center">操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>' +
    '<div id="detail-slot"></div>';
  $('#view-archives').innerHTML = html;
}

function showDetail(id) {
  const f = state.archived.find(function (x) { return x.id === id; });
  if (!f) return;
  const slot = $('#detail-slot');
  slot.innerHTML =
    '<div class="card mt-2"><div class="card-head"><div class="card-title">档案详情</div>' +
      '<span class="more" data-action="close-detail">关闭</span></div>' +
      '<div class="desc-list">' +
        descRow('档号', f.archiveNo) + descRow('保管期限', f.retention) +
        descRow('文件题名', f.title) + descRow('发文字号', f.docNo) +
        descRow('责任部门', f.department) + descRow('文种', f.docType) +
        descRow('事由类别', f.subject) + descRow('密级', f.security) +
        descRow('成文日期', f.date) + descRow('归档日期', f.archiveDate) +
        descRow('命中规则', f.ruleRef + '（' + f.clause + '）') + descRow('鉴定置信度', Math.round(f.confidence * 100) + '%') +
      '</div></div>';
}

// ============================================================
//  视图五：检索利用
// ============================================================
let searchKeyword = '';
let searchRetention = 'all';

function renderSearch() {
  const html =
    '<div class="card">' +
      '<div class="card-head"><div class="card-title">档案检索</div></div>' +
      '<div class="toolbar" style="margin-bottom:8px">' +
        '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" id="search-kw" placeholder="输入题名、发文字号、事由关键词" value="' + esc(searchKeyword) + '">' + '</div>' +
        '<select class="filter-select" id="search-retention">' +
          '<option value="all">全部保管期限</option><option value="永久">永久</option><option value="30年">30年</option><option value="10年">10年</option>' +
        '</select>' +
      '</div>' +
      '<div id="search-results" class="mt-2"></div>' +
    '</div>' +

    '<div class="card mt-2"><div class="card-head"><div class="card-title">借阅记录</div></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>借阅编号</th><th>档案题名</th><th>借阅人</th><th>部门</th><th>借出日期</th><th>应还日期</th><th class="center">状态</th>' +
      '</tr></thead><tbody>' + state.loans.map(loanRow).join('') + '</tbody></table></div>' +
    '</div>';

  $('#view-search').innerHTML = html;
  $('#search-retention').value = searchRetention;
  bindSearch();
  doSearchRender();
}

function loanRow(l) {
  const tag = l.status === '借阅中' ? '<span class="tag tag-amber">借阅中</span>' : '<span class="tag tag-grey">已归还</span>';
  return '<tr><td>' + l.id + '</td><td><div class="cell-title">' + esc(l.title) + '</div><div class="cell-sub">' + esc(l.archiveNo) + '</div></td>' +
    '<td>' + esc(l.borrower) + '</td><td>' + esc(l.department) + '</td><td>' + l.borrowDate + '</td><td>' + l.dueDate + '</td>' +
    '<td class="center">' + tag + '</td></tr>';
}

function bindSearch() {
  const kw = $('#search-kw');
  kw.addEventListener('input', function () { searchKeyword = kw.value; doSearchRender(); });
  $('#search-retention').addEventListener('change', function (e) { searchRetention = e.target.value; doSearchRender(); });
}

function doSearchRender() {
  const kw = searchKeyword.trim().toLowerCase();
  let results = state.archived.filter(function (f) {
    const matchKw = !kw || f.title.toLowerCase().indexOf(kw) >= 0 ||
      f.docNo.toLowerCase().indexOf(kw) >= 0 || f.subject.toLowerCase().indexOf(kw) >= 0;
    const matchRet = searchRetention === 'all' || f.retention === searchRetention;
    return matchKw && matchRet;
  });

  const slot = $('#search-results');
  if (!results.length) {
    slot.innerHTML = '<div class="empty-state"><div class="empty-text">未检索到符合条件的档案</div></div>';
    return;
  }
  slot.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th class="center">保管期限</th><th>档案题名</th><th>责任部门</th><th>事由</th><th class="center">操作</th>' +
    '</tr></thead><tbody>' + results.map(function (f) {
      return '<tr><td class="center"><span class="retention-tag ' + retentionClass(f.retention) + '">' + f.retention + '</span></td>' +
        '<td>' + esc(f.title) + '</td><td>' + esc(f.department) + '</td><td>' + esc(f.subject) + '</td>' +
        '<td class="center"><button class="btn btn-outline btn-sm" data-action="borrow" data-id="' + f.id + '">申请借阅</button></td></tr>';
    }).join('') + '</tbody></table></div>';
}

function doBorrow(id) {
  const f = state.archived.find(function (x) { return x.id === id; });
  const today = new Date();
  const due = new Date(today.getTime() + 14 * 86400000);
  const fmt = function (d) { return d.toISOString().slice(0, 10); };
  const seq = state.loans.length + 1;
  state.loans.push({
    id: 'LOAN-' + String(seq).padStart(3, '0'),
    archiveNo: f.archiveNo, title: f.title, borrower: '档案管理员',
    department: f.department, borrowDate: fmt(today), dueDate: fmt(due), status: '借阅中'
  });
  renderSearch();
  showToast('借阅申请成功，应还日期 ' + fmt(due), 'success');
}

// ============================================================
//  路由
// ============================================================
const RENDERERS = {
  dashboard: renderDashboard, intake: renderIntake,
  appraisal: renderAppraisal, archives: renderArchives, search: renderSearch
};

function switchRoute(route) {
  if (!RENDERERS[route]) route = 'dashboard';
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  $('#view-' + route).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.toggle('active', n.getAttribute('data-route') === route);
  });
  const meta = PAGE_META[route];
  $('#page-title').textContent = meta.title;
  $('#page-crumb').textContent = meta.crumb;
  RENDERERS[route]();
}

function handleHash() {
  const route = (location.hash || '#dashboard').replace('#', '').split('?')[0];
  switchRoute(route);
}

function updateBadge() {
  const pending = state.intake.filter(function (f) { return f.status === 'pending'; }).length;
  const b = $('#intake-badge');
  if (b) b.textContent = pending;
}

// ---------- 全局事件委托 ----------
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');

  switch (action) {
    case 'go': location.hash = el.getAttribute('data-route'); break;
    case 'to-appraisal':
      state.appraisalId = id; location.hash = 'appraisal'; break;
    case 'pick':
      state.appraisalId = id; renderAppraisal(); break;
    case 'run':
      const file = state.intake.find(function (f) { return f.id === id; });
      ruleResult(file, matchRule(file)); break;
    case 'archive': doArchive(id); break;
    case 'return-file': doReturn(id); break;
    case 'detail': showDetail(id); break;
    case 'close-detail': $('#detail-slot').innerHTML = ''; break;
    case 'borrow': doBorrow(id); break;
  }
});

window.addEventListener('hashchange', handleHash);
handleHash();
updateBadge();
