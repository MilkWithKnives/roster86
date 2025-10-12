import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Create axios instance with auth header
const api = axios.create({
    baseURL: API_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Create a Stripe Checkout session and redirect to checkout
 * @param {string} priceId - Stripe Price ID
 * @param {string} planName - Plan name for metadata
 * @returns {Promise<{sessionId: string, url: string}>}
 */
export const createCheckoutSession = async (priceId, planName) => {
    try {
        const response = await api.post('/api/payments/create-checkout-session', {
            priceId,
            planName
        });
        return response.data;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error.response?.data || error;
    }
};

/**
 * Create a payment intent for one-time payments
 * @param {number} amount - Amount in dollars
 * @param {string} description - Payment description
 * @returns {Promise<{clientSecret: string}>}
 */
export const createPaymentIntent = async (amount, description) => {
    try {
        const response = await api.post('/api/payments/create-payment-intent', {
            amount,
            description
        });
        return response.data;
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error.response?.data || error;
    }
};

/**
 * Get current subscription status
 * @returns {Promise<{hasSubscription: boolean, subscription?: object}>}
 */
export const getSubscriptionStatus = async () => {
    try {
        const response = await api.get('/api/payments/subscription-status');
        return response.data;
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        throw error.response?.data || error;
    }
};

/**
 * Cancel current subscription
 * @returns {Promise<{message: string, subscription: object}>}
 */
export const cancelSubscription = async () => {
    try {
        const response = await api.post('/api/payments/cancel-subscription');
        return response.data;
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error.response?.data || error;
    }
};

/**
 * Create a Customer Portal session for managing subscription
 * @returns {Promise<{url: string}>}
 */
export const createPortalSession = async () => {
    try {
        const response = await api.post('/api/payments/portal-session');
        return response.data;
    } catch (error) {
        console.error('Error creating portal session:', error);
        throw error.response?.data || error;
    }
};

export default {
    createCheckoutSession,
    createPaymentIntent,
    getSubscriptionStatus,
    cancelSubscription,
    createPortalSession
};
