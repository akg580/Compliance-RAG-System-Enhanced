export const processQuery = (query, userRole, policyDatabase, roleHierarchy) => {
  let matchedPolicy = null;
  let matchedSection = null;
  let confidence = 0;

  const queryLower = query.toLowerCase();

  if (queryLower.includes('ltv') && queryLower.includes('commercial')) {
    matchedPolicy = policyDatabase['CRE-001-v2.3'];
    matchedSection = matchedPolicy.sections['4.2.1'];
    confidence = 92;
  } else if (queryLower.includes('basel') || queryLower.includes('capital requirement')) {
    matchedPolicy = policyDatabase['BASEL-III-2024'];
    matchedSection = matchedPolicy.sections['3.1.1'];
    confidence = 88;
  } else if (queryLower.includes('credit score') && queryLower.includes('mortgage')) {
    matchedPolicy = policyDatabase['RES-003-v1.8'];
    matchedSection = matchedPolicy.sections['2.1.3'];
    confidence = 90;
  } else if (queryLower.includes('auto loan')) {
    matchedPolicy = policyDatabase['AUTO-LOAN-v2.1'];
    matchedSection = matchedPolicy.sections['1.2.4'];
    confidence = 85;
  }

  if (matchedPolicy) {
    const hasAccess = roleHierarchy[userRole].includes(matchedPolicy.requiredRole);
    
    if (!hasAccess) {
      return {
        type: 'rbac_denial',
        message: 'Insufficient access permissions',
        policyName: matchedPolicy.name,
        requiredRole: matchedPolicy.requiredRole,
        recommendedAction: `Consult ${matchedPolicy.requiredRole} or Risk Officer for this information`
      };
    }
  }

  if (!matchedPolicy || confidence < 70) {
    return {
      type: 'no_policy',
      message: 'No definitive policy found for this query',
      recommendedAction: 'Please refine your query or consult the Policy Documentation Team',
      searchedTerms: query
    };
  }

  return {
    type: 'success',
    answer: matchedSection.text,
    citation: {
      policyId: Object.keys(policyDatabase).find(key => policyDatabase[key] === matchedPolicy),
      policyName: matchedPolicy.name,
      version: matchedPolicy.version,
      section: Object.keys(matchedPolicy.sections)[0],
      page: matchedSection.page,
      effectiveDate: matchedPolicy.effectiveDate
    },
    preconditions: matchedSection.conditions,
    exceptions: matchedSection.exceptions,
    confidence: confidence,
    riskLevel: matchedPolicy.riskLevel
  };
};