import { policyDatabase } from './policyDatabase';

// Simulated retrieval function with RBAC and semantic search
export const retrievePolicy = (userQuery, role) => {
  const queryLower = userQuery.toLowerCase();
  const queryTokens = queryLower.split(' ').filter(t => t.length > 2);
  
  // Semantic matching simulation
  const results = policyDatabase
    .filter(policy => policy.allowedRoles.includes(role))
    .map(policy => {
      const matchScore = policy.keywords.filter(kw => 
        queryTokens.some(qt => kw.includes(qt) || qt.includes(kw))
      ).length;
      return { ...policy, score: matchScore };
    })
    .filter(policy => policy.score > 0)
    .sort((a, b) => b.score - a.score);

  return results.length > 0 ? results[0] : null;
};

// Generate grounded response with mandatory citations
export const generateResponse = async (userQuery, retrievedChunk) => {
  if (!retrievedChunk) {
    return {
      type: 'refusal',
      message: 'No definitive policy found for this query. This may indicate: (1) Query is outside policy scope, (2) Insufficient access permissions, or (3) Policy gap requiring manual review.',
      confidence: 0,
      citations: []
    };
  }

  // Simulate LLM processing with strict grounding
  const answer = {
    type: 'success',
    summary: `Based on ${retrievedChunk.policyName}, ${retrievedChunk.clauseId}:`,
    policyText: retrievedChunk.content,
    citations: [{
      policyName: retrievedChunk.policyName,
      version: retrievedChunk.version,
      pageNumber: retrievedChunk.pageNumber,
      clauseId: retrievedChunk.clauseId,
      effectiveDate: retrievedChunk.effectiveDate,
      chunkId: retrievedChunk.id
    }],
    confidence: 0.92,
    preconditions: retrievedChunk.content.match(/Precondition:([^.]+)/)?.[1]?.trim() || 'None specified',
    exceptions: retrievedChunk.content.match(/Exception:([^.]+)/)?.[1]?.trim() || 'None specified',
    metadata: {
      retrievalMethod: 'Semantic chunking with policy-aware boundaries',
      modelUsed: 'GPT-4o (generation only)',
      timestamp: new Date().toISOString()
    }
  };

  return answer;
};