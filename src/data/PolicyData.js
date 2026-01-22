export const POLICY_DATABASE = {
  'CRE-001-v2.3': {
    name: 'Commercial Real Estate Lending Policy',
    version: 'v2.3',
    effectiveDate: '2024-01-15',
    sections: {
      '4.2.1': {
        text: 'Maximum Loan-to-Value (LTV) ratio for commercial real estate in Zone B shall not exceed 75% for stabilized properties.',
        page: 12,
        conditions: ['Property must be stabilized', 'Independent appraisal required'],
        exceptions: ['LTV may reach 80% with DSCR >=1.35 and Senior Credit Committee approval']
      }
    },
    requiredRole: 'Senior Loan Officer',
    riskLevel: 'Medium'
  },
  'RES-003-v1.8': {
    name: 'Residential Mortgage Underwriting Standards',
    version: 'v1.8',
    effectiveDate: '2024-02-01',
    sections: {
      '2.1.3': {
        text: 'Minimum credit score for conventional residential mortgages is 620. Borrowers must demonstrate 24 months of stable employment history.',
        page: 8,
        conditions: ['24 months stable employment', 'Debt-to-Income ratio <=43%'],
        exceptions: ['DTI may reach 50% with compensating factors: 12+ months reserves, credit score >720, or 20%+ down payment']
      }
    },
    requiredRole: 'Junior Officer',
    riskLevel: 'Low'
  },
  'BASEL-III-2024': {
    name: 'Basel III Capital Requirements Framework',
    version: 'v4.2',
    effectiveDate: '2024-01-01',
    sections: {
      '3.1.1': {
        text: 'Common Equity Tier 1 (CET1) capital ratio must be maintained at minimum 4.5% of risk-weighted assets. Capital conservation buffer of 2.5% must be maintained above minimum requirements.',
        page: 45,
        conditions: ['Applies to all corporate exposures', 'Monthly reporting required'],
        exceptions: []
      }
    },
    requiredRole: 'Risk Officer',
    riskLevel: 'High'
  },
  'AUTO-LOAN-v2.1': {
    name: 'Auto Loan Origination Policy',
    version: 'v2.1',
    effectiveDate: '2023-12-01',
    sections: {
      '1.2.4': {
        text: 'Maximum auto loan term is 72 months for new vehicles and 60 months for used vehicles. Prime rate applies to borrowers with credit score >=720.',
        page: 5,
        conditions: ['Vehicle age restrictions apply', 'Maximum LTV 110% for new vehicles'],
        exceptions: ['Extended terms available for electric vehicles up to 84 months']
      }
    },
    requiredRole: 'Junior Officer',
    riskLevel: 'Low'
  }
};

export const ROLE_HIERARCHY = {
  'Junior Officer': ['Junior Officer'],
  'Senior Loan Officer': ['Junior Officer', 'Senior Loan Officer'],
  'Credit Manager': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager'],
  'Risk Officer': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager', 'Risk Officer'],
  'Senior Management': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager', 'Risk Officer', 'Senior Management']
};