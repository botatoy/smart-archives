/* ============================================================
   模拟档案数据 + 鉴定规则库
   数据字段对应真实档案管理系统的元数据结构
   ============================================================ */

// 保管期限规则库（对应第七次作业：保管期限表结构化）
// 每条规则：条件组合 → 保管期限 + 条款编号 + 置信度
const RETENTION_RULES = [
  {
    id: 'R01',
    clause: '第8条第1款',
    conditions: { subject: '人事任免' },
    retention: '永久',
    confidence: 0.98,
    reason: '人事任免文件属于本单位核心职能凭证，依据保管期限表第8条第1款，永久保存。'
  },
  {
    id: 'R02',
    clause: '第5条第1款',
    conditions: { subject: '规章制度', docType: '办法' },
    retention: '永久',
    confidence: 0.96,
    reason: '本单位制定的规章制度、管理办法属于主要职能活动依据，依据第5条第1款，永久保存。'
  },
  {
    id: 'R03',
    clause: '第3条第2款',
    conditions: { subject: '年度总结', docType: '报告' },
    retention: '永久',
    confidence: 0.94,
    reason: '本单位年度工作总结全面反映全年职能活动，依据第3条第2款，永久保存。'
  },
  {
    id: 'R04',
    clause: '第12条第1款',
    conditions: { subject: '重要会议' },
    retention: '30年',
    confidence: 0.92,
    reason: '局长办公会、专题工作会议形成的纪要与材料，依据第12条第1款，保管30年。'
  },
  {
    id: 'R05',
    clause: '第15条第3款',
    conditions: { subject: '项目管理', docType: '合同' },
    retention: '30年',
    confidence: 0.9,
    reason: '重点项目合同及验收材料，依据第15条第3款，自项目结束起保管30年。'
  },
  {
    id: 'R06',
    clause: '第18条第2款',
    conditions: { subject: '财务预算', docType: '批复' },
    retention: '10年',
    confidence: 0.9,
    reason: '一般业务经费预算批复，依据第18条第2款，保管10年。'
  },
  {
    id: 'R07',
    clause: '第20条第1款',
    conditions: { subject: '日常事务', docType: '通知' },
    retention: '10年',
    confidence: 0.88,
    reason: '一般性事务通知、工作安排，依据第20条第1款，保管10年。'
  },
  {
    id: 'R08',
    clause: '第16条第2款',
    conditions: { subject: '业务请示', docType: '请示' },
    retention: '10年',
    confidence: 0.85,
    reason: '一般业务请示与批复，依据第16条第2款，保管10年。'
  }
];

// 预归档文件（刚从OA捕获，尚未鉴定）
const INTAKE_FILES = [
  {
    id: 'PRE-2026-018',
    title: '关于2026年度中层领导干部职务任免的决定',
    docNo: '南档任〔2026〕3号',
    department: '人事部',
    docType: '决定',
    subject: '人事任免',
    date: '2026-01-15',
    security: '内部',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-019',
    title: '关于印发《电子档案管理办法（修订版）》的通知',
    docNo: '南档发〔2026〕5号',
    department: '办公室',
    docType: '办法',
    subject: '规章制度',
    date: '2026-02-08',
    security: '公开',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-020',
    title: '档案馆2025年度工作总结',
    docNo: '南档办〔2026〕2号',
    department: '办公室',
    docType: '报告',
    subject: '年度总结',
    date: '2026-01-20',
    security: '内部',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-021',
    title: '数字档案馆升级项目建设合同',
    docNo: 'HT-2026-011',
    department: '技术部',
    docType: '合同',
    subject: '项目管理',
    date: '2026-03-12',
    security: '内部',
    source: '业务系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-022',
    title: '关于一季度档案业务培训经费预算的批复',
    docNo: '南档财〔2026〕9号',
    department: '财务部',
    docType: '批复',
    subject: '财务预算',
    date: '2026-02-25',
    security: '内部',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-023',
    title: '关于开展2026年档案安全检查工作的通知',
    docNo: '南档通〔2026〕14号',
    department: '安保部',
    docType: '通知',
    subject: '日常事务',
    date: '2026-04-02',
    security: '公开',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: false, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-024',
    title: '关于馆藏档案数字化外包服务采购的请示',
    docNo: '南档技〔2026〕7号',
    department: '技术部',
    docType: '请示',
    subject: '业务请示',
    date: '2026-03-28',
    security: '内部',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: true },
    status: 'pending'
  },
  {
    id: 'PRE-2026-025',
    title: '智慧档案馆建设专题工作会议纪要',
    docNo: '南档纪〔2026〕6号',
    department: '办公室',
    docType: '纪要',
    subject: '重要会议',
    date: '2026-04-10',
    security: '秘密',
    source: 'OA系统',
    fourCheck: { authenticity: true, completeness: true, usability: true, security: false },
    status: 'pending'
  }
];

// 已正式归档的档案（用于档案管理、工作台统计）
const ARCHIVED_FILES = [
  {
    id: 'ARC-2025-001',
    archiveNo: '办-2025-永久-001',
    title: '关于2024年度干部考核结果的决定',
    docNo: '南档任〔2025〕2号',
    department: '人事部',
    docType: '决定',
    subject: '人事任免',
    date: '2025-01-18',
    security: '内部',
    retention: '永久',
    confidence: 0.97,
    ruleRef: 'R01',
    clause: '第8条第1款',
    archiveDate: '2025-02-10',
    status: 'archived'
  },
  {
    id: 'ARC-2025-002',
    archiveNo: '办-2025-永久-002',
    title: '档案馆2024年度工作总结',
    docNo: '南档办〔2025〕1号',
    department: '办公室',
    docType: '报告',
    subject: '年度总结',
    date: '2025-01-22',
    security: '内部',
    retention: '永久',
    confidence: 0.95,
    ruleRef: 'R03',
    clause: '第3条第2款',
    archiveDate: '2025-02-15',
    status: 'archived'
  },
  {
    id: 'ARC-2025-003',
    archiveNo: '办-2025-30年-003',
    title: '档案库房改造项目验收会议纪要',
    docNo: '南档纪〔2025〕4号',
    department: '技术部',
    docType: '纪要',
    subject: '重要会议',
    date: '2025-05-14',
    security: '内部',
    retention: '30年',
    confidence: 0.91,
    ruleRef: 'R04',
    clause: '第12条第1款',
    archiveDate: '2025-06-02',
    status: 'archived'
  },
  {
    id: 'ARC-2025-004',
    archiveNo: '办-2025-10年-004',
    title: '关于2025年档案宣传周活动安排的通知',
    docNo: '南档通〔2025〕11号',
    department: '办公室',
    docType: '通知',
    subject: '日常事务',
    date: '2025-06-01',
    security: '公开',
    retention: '10年',
    confidence: 0.89,
    ruleRef: 'R07',
    clause: '第20条第1款',
    archiveDate: '2025-06-20',
    status: 'archived'
  },
  {
    id: 'ARC-2025-005',
    archiveNo: '办-2025-30年-005',
    title: '档案管理系统运维服务合同',
    docNo: 'HT-2025-008',
    department: '技术部',
    docType: '合同',
    subject: '项目管理',
    date: '2025-03-08',
    security: '内部',
    retention: '30年',
    confidence: 0.9,
    ruleRef: 'R05',
    clause: '第15条第3款',
    archiveDate: '2025-04-01',
    status: 'archived'
  },
  {
    id: 'ARC-2025-006',
    archiveNo: '办-2025-10年-006',
    title: '关于购置档案消毒设备经费的批复',
    docNo: '南档财〔2025〕7号',
    department: '财务部',
    docType: '批复',
    subject: '财务预算',
    date: '2025-02-26',
    security: '内部',
    retention: '10年',
    confidence: 0.9,
    ruleRef: 'R06',
    clause: '第18条第2款',
    archiveDate: '2025-03-15',
    status: 'archived'
  }
];

// 借阅记录
const LOAN_RECORDS = [
  { id: 'LOAN-001', archiveNo: '办-2025-永久-001', title: '关于2024年度干部考核结果的决定', borrower: '张明', department: '人事部', borrowDate: '2026-03-10', dueDate: '2026-03-24', status: '已归还' },
  { id: 'LOAN-002', archiveNo: '办-2025-30年-005', title: '档案管理系统运维服务合同', borrower: '李华', department: '技术部', borrowDate: '2026-04-01', dueDate: '2026-04-15', status: '借阅中' },
  { id: 'LOAN-003', archiveNo: '办-2025-永久-002', title: '档案馆2024年度工作总结', borrower: '王芳', department: '办公室', borrowDate: '2026-04-18', dueDate: '2026-05-02', status: '借阅中' }
];
