// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Query policy documents
 */
export async function queryPolicy(query, userRole, userId = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        user_role: userRole,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Query API error:', error);
    throw error;
  }
}

/**
 * Upload policy document
 */
export async function uploadPolicy(file, metadata = {}) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata fields
    if (metadata.policy_id) formData.append('policy_id', metadata.policy_id);
    if (metadata.name) formData.append('name', metadata.name);
    if (metadata.version) formData.append('version', metadata.version);
    if (metadata.effective_date) formData.append('effective_date', metadata.effective_date);
    if (metadata.required_role) formData.append('required_role', metadata.required_role);
    if (metadata.risk_level) formData.append('risk_level', metadata.risk_level);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload API error:', error);
    throw error;
  }
}

/**
 * Health check
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

/**
 * Get system stats
 */
export async function getStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Stats API error:', error);
    throw error;
  }
}

export default {
  queryPolicy,
  uploadPolicy,
  healthCheck,
  getStats
};