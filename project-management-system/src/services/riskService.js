import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const fetchProjectRisks = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/risks`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch risks');
  }
};

export const createRisk = async (projectId, riskData) => {
  setupAuthHeader();
  try {
    const response = await axios.post(`${API_URL}/api/projects/${projectId}/risks`, riskData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create risk');
  }
};

export const updateRisk = async (projectId, riskId, riskData) => {
  setupAuthHeader();
  try {
    const updatedData = {
      ...riskData,
      // Add risk impact metrics
      impact_score: calculateImpactScore(riskData.severity, riskData.probability),
      risk_rating: calculateRiskRating(riskData.severity, riskData.probability),
      // Track historical changes
      status_history: riskData.status_history || [],
      last_review_date: new Date().toISOString(),
      next_review_date: calculateNextReviewDate(riskData.severity)
    };

    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/risks/${riskId}`,
      updatedData
    );

    return response.data;
  } catch (error) {
    console.error('Risk update error:', error);
    throw new Error(error.response?.data?.message || 'Failed to update risk');
  }
};

export const deleteRisk = async (projectId, riskId) => {
  setupAuthHeader();
  try {
    await axios.delete(`${API_URL}/api/projects/${projectId}/risks/${riskId}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete risk');
  }
};

// Helper functions for risk assessment
const calculateImpactScore = (severity, probability) => {
  const severityScore = {
    low: 1,
    medium: 2,
    high: 3
  };
  
  const probabilityScore = {
    low: 1,
    medium: 2,
    high: 3
  };

  return severityScore[severity] * probabilityScore[probability];
};

const calculateRiskRating = (severity, probability) => {
  const impactScore = calculateImpactScore(severity, probability);
  if (impactScore >= 6) return 'Critical';
  if (impactScore >= 4) return 'High';
  if (impactScore >= 2) return 'Medium';
  return 'Low';
};

const calculateNextReviewDate = (severity) => {
  const today = new Date();
  switch (severity) {
    case 'high':
      return new Date(today.setDate(today.getDate() + 7)); // Weekly review
    case 'medium':
      return new Date(today.setDate(today.getDate() + 14)); // Bi-weekly review
    default:
      return new Date(today.setDate(today.getDate() + 30)); // Monthly review
  }
};

// Add risk assessment analytics
export const getRiskAnalytics = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/risks/analytics`);
    
    // Log the analytics data for debugging
    console.log('Risk analytics response:', response.data);

    // Calculate risk counts from the actual risks data
    const risks = await fetchProjectRisks(projectId);
    const criticalCount = risks.filter(risk => 
      risk.severity === 'high' && risk.probability === 'high'
    ).length;

    const highCount = risks.filter(risk => 
      (risk.severity === 'high' || risk.probability === 'high') &&
      !(risk.severity === 'high' && risk.probability === 'high') // Exclude critical risks
    ).length;

    const upcomingReviews = risks.filter(risk => {
      if (!risk.next_review_date) return false;
      const reviewDate = new Date(risk.next_review_date);
      const today = new Date();
      const daysUntilReview = Math.ceil((reviewDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilReview <= 7 && risk.status !== 'resolved';
    });

    // Calculate trend based on historical data
    const trend = calculateRiskTrend(risks);

    return {
      criticalCount,
      highCount,
      upcomingReviews,
      trend,
      totalActive: risks.filter(risk => risk.status !== 'resolved').length,
      resolvedCount: risks.filter(risk => risk.status === 'resolved').length
    };
  } catch (error) {
    console.error('Risk analytics error:', error);
    throw new Error('Failed to fetch risk analytics');
  }
};

// Helper function to calculate risk trend
const calculateRiskTrend = (risks) => {
  const activeRisks = risks.filter(risk => risk.status !== 'resolved');
  const highSeverityCount = activeRisks.filter(risk => 
    risk.severity === 'high' || risk.probability === 'high'
  ).length;

  // Compare with threshold to determine trend
  const threshold = Math.ceil(activeRisks.length * 0.3); // 30% threshold
  
  if (highSeverityCount >= threshold) {
    return 'increasing';
  } else if (highSeverityCount === 0) {
    return 'decreasing';
  }
  return 'stable';
};

// Add risk trends analysis
export const getRiskTrends = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/risks/trends`);
    return {
      trend: response.data.trend || 'stable',
      historicalData: response.data.historical_data || [],
      predictions: response.data.predictions || []
    };
  } catch (error) {
    console.error('Risk trends error:', error);
    throw new Error('Failed to fetch risk trends');
  }
};
