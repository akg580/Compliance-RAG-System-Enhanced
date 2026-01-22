// Simulated policy database with semantic chunks
// In production, this would be stored in Pinecone or similar vector DB

export const policyDatabase = [
  {
    id: 'CRE-001-v2.3',
    policyName: 'Commercial Real Estate Lending Policy',
    version: '2.3',
    effectiveDate: '2024-09-01',
    pageNumber: 12,
    clauseId: 'Section 4.2.1',
    riskLevel: 'high',
    allowedRoles: ['Senior Loan Officer', 'Credit Manager', 'Risk Officer'],
    content: 'For commercial real estate loans in Zone B metropolitan areas, the maximum Loan-to-Value (LTV) ratio shall not exceed 75% for stabilized properties. Exception: Properties with 10+ year operating history and debt service coverage ratio (DSCR) ≥ 1.35 may qualify for LTV up to 80% with senior credit committee approval.',
    keywords: ['ltv', 'commercial', 'real estate', 'zone b', 'loan to value']
  },
  {
    id: 'RES-045-v1.8',
    policyName: 'Residential Mortgage Underwriting Standards',
    version: '1.8',
    effectiveDate: '2024-11-15',
    pageNumber: 23,
    clauseId: 'Section 7.1.3',
    riskLevel: 'medium',
    allowedRoles: ['Senior Loan Officer', 'Credit Manager', 'Risk Officer', 'Junior Officer'],
    content: 'The maximum debt-to-income (DTI) ratio for conventional residential mortgages is 43%. Precondition: Borrower must have minimum credit score of 680. Exception: DTI up to 50% is permissible with compensating factors including cash reserves equal to 12 months PITI and verified stable employment history of 5+ years.',
    keywords: ['dti', 'debt to income', 'residential', 'mortgage', 'credit score']
  },
  {
    id: 'AUTO-012-v3.1',
    policyName: 'Auto Loan Credit Policy',
    version: '3.1',
    effectiveDate: '2025-01-05',
    pageNumber: 8,
    clauseId: 'Section 2.4',
    riskLevel: 'low',
    allowedRoles: ['Senior Loan Officer', 'Credit Manager', 'Risk Officer', 'Junior Officer'],
    content: 'Maximum loan amount for new vehicle financing is $75,000. Loan term shall not exceed 72 months. Interest rates are tiered based on credit score: Tier 1 (740+): Prime rate, Tier 2 (680-739): Prime + 1.5%, Tier 3 (620-679): Prime + 3.5%. Minimum down payment: 10% for all tiers.',
    keywords: ['auto', 'vehicle', 'loan amount', 'term', 'interest rate', 'down payment']
  },
  {
    id: 'BASEL-089-v4.2',
    policyName: 'Basel III Capital Requirements',
    version: '4.2',
    effectiveDate: '2024-08-01',
    pageNumber: 156,
    clauseId: 'Article 12.5',
    riskLevel: 'critical',
    allowedRoles: ['Risk Officer', 'Senior Management'],
    content: 'Risk-weighted assets for corporate exposures must maintain Common Equity Tier 1 (CET1) capital ratio of minimum 4.5%. Total capital ratio including additional Tier 1 and Tier 2 must not fall below 8%. Capital conservation buffer of 2.5% must be maintained above minimum requirements.',
    keywords: ['basel', 'capital', 'tier 1', 'risk weighted', 'ratio']
  },
  {
    id: 'SBL-023-v1.5',
    policyName: 'Small Business Lending Guidelines',
    version: '1.5',
    effectiveDate: '2024-10-20',
    pageNumber: 34,
    clauseId: 'Section 5.3',
    riskLevel: 'medium',
    allowedRoles: ['Senior Loan Officer', 'Credit Manager', 'Risk Officer'],
    content: 'Small business loans under $500,000 require minimum two years of business operation history. Maximum DTI is 1.25x. Precondition: Personal guarantee from owners with >20% equity stake. Exception: SBA-backed loans may qualify with 12-month operating history if supported by strong personal credit (720+).',
    keywords: ['small business', 'sba', 'business loan', 'guarantee', 'operating history']
  }
];