const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Subscription plans configuration
const PLANS = {
  STARTER: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID, // You'll get this from Stripe Dashboard
    price: 2900, // $29.00 in cents
    features: {
      maxEmployees: 25,
      maxSchedules: 10,
      advancedReports: false,
      apiAccess: false,
      customIntegrations: false,
      prioritySupport: false
    }
  },
  PROFESSIONAL: {
    name: 'Professional',
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    price: 7900, // $79.00 in cents
    features: {
      maxEmployees: 100,
      maxSchedules: 50,
      advancedReports: true,
      apiAccess: true,
      customIntegrations: false,
      prioritySupport: true
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 19900, // $199.00 in cents
    features: {
      maxEmployees: -1, // Unlimited
      maxSchedules: -1, // Unlimited
      advancedReports: true,
      apiAccess: true,
      customIntegrations: true,
      prioritySupport: true
    }
  }
};

// Helper functions
const formatPrice = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
};

const getPlanByPriceId = (priceId) => {
  return Object.values(PLANS).find(plan => plan.priceId === priceId);
};

const checkFeatureLimit = (organizationPlan, feature, currentUsage) => {
  const plan = PLANS[organizationPlan];
  if (!plan) return false;
  
  const limit = plan.features[feature];
  if (limit === -1) return true; // Unlimited
  if (limit === false) return false; // Not allowed
  
  return currentUsage < limit;
};

module.exports = {
  stripe,
  PLANS,
  formatPrice,
  getPlanByPriceId,
  checkFeatureLimit
};