// src/constants/index.js

export const USER_ROLES = [
  'Junior Officer',
  'Senior Loan Officer',
  'Credit Manager',
  'Risk Officer',
  'Senior Management',
];

export const RISK_LEVELS = ['Low', 'Medium', 'High'];

export const QUICK_ACTIONS = [
  {
    id: 'cre-ltv',
    icon: '🏢',
    label: 'CRE LTV Limits',
    query: 'What is the maximum LTV ratio for commercial real estate loans?',
  },
  {
    id: 'mortgage-standards',
    icon: '🏠',
    label: 'Mortgage Standards',
    query: 'What are the residential mortgage underwriting standards and credit score requirements?',
  },
  {
    id: 'compliance-training',
    icon: '📋',
    label: 'BSA/AML Training',
    query: 'What are the mandatory BSA/AML compliance training requirements?',
  },
  {
    id: 'dti-limits',
    icon: '📊',
    label: 'DTI Ratio Limits',
    query: 'What are the debt-to-income ratio limits for qualified mortgages?',
  },
];

/** Tabs available in the main navigation */
export const APP_TABS = {
  QUERY:  'query',
  AUDIT:  'audit',
  UPLOAD: 'upload',
};

/** LocalStorage keys */
export const STORAGE_KEYS = {
  SESSION: 'crag_session',
  USERS:   'crag_users',
  AUDIT:   'crag_audit',
};

/** Audit entry statuses */
export const AUDIT_STATUS = {
  SUCCESS:   'SUCCESS',
  NO_RESULT: 'NO_RESULT',
  ERROR:     'ERROR',
};

/** Max audit entries to keep in localStorage */
export const MAX_AUDIT_ENTRIES = 500;

/** Seeded demo credentials – visible on login page */
export const DEMO_CREDENTIALS = {
  email:    'demo@complianceai.io',
  password: 'demo123',
  name:     'Demo User',
  role:     'Senior Loan Officer',
};
