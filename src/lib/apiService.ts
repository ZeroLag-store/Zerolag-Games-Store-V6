/**
 * API Service for communicating with the Express backend.
 */
export const apiService = {
  /**
   * Check if the backend is healthy.
   */
  async checkHealth() {
    const response = await fetch('/api/health');
    return response.json();
  },

  /**
   * Process a secure order on the backend.
   */
  async processOrder(orderData: any) {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderData }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process order on backend');
    }
    
    return response.json();
  },

  /**
   * Get AI insights about an order.
   */
  async getAIInsights(orderItems: any[]) {
    const response = await fetch('/api/ai/analyze-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems }),
    });
    
    if (!response.ok) {
      throw new Error('AI analysis failed');
    }
    
    return response.json();
  }
};
