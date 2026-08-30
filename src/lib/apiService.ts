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
   * Get AI Game Recommendations based on user mood/preference.
   */
  async getRecommendations(mood: string) {
    const response = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood }),
    });
    if (!response.ok) {
      throw new Error('AI recommendation service unavailable');
    }
    return response.json();
  },

  /**
   * Smart Semantic Search across products catalog.
   */
  async smartSearch(query: string, products: any[]) {
    const response = await fetch('/api/ai/smart-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, products }),
    });
    if (!response.ok) {
      throw new Error('Smart search failed');
    }
    return response.json();
  },

  /**
   * AI Support Hub Chat message.
   */
  async sendSupportMessage(message: string, history: any[] = []) {
    const response = await fetch('/api/ai/support-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!response.ok) {
      throw new Error('Support chat failed');
    }
    return response.json();
  },

  /**
   * Dispatch Order Confirmation / Details Notification.
   */
  async sendOrderNotification(payload: {
    orderId: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    items?: any[];
    total?: number;
    credentials?: string;
    status?: string;
  }) {
    const response = await fetch('/api/orders/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to dispatch order notification');
    }
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
