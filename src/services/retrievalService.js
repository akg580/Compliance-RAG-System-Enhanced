import { searchPolicies } from './policyDatabase';

export async function retrieve(query) {
  // stub: synchronous filter, but kept async for future replacement
  return searchPolicies(query);
}