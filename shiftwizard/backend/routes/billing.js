const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const stripeService = require('../services/stripe');
const database = require('../models/database');
const { PLANS } = require('../config/stripe');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/billing/plans - Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.keys(PLANS).map(key => ({
      id: key,
      ...PLANS[key]
    }));

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch plans'
    });
  }
});

// POST /api/billing/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { priceId } = req.body;
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User must belong to an organization'
      });
    }

    // Get or create organization
    let organization = await database.get(
      'SELECT * FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        message: 'Organization does not exist'
      });
    }

    let customerId = organization.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripeService.createCustomer({
        organizationName: organization.name,
        email: req.user.email,
        organizationId: organizationId
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      organizationId,
      priceId,
      customerId,
      successUrl: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/billing/cancel`
    });

    res.json({ sessionUrl: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create checkout session'
    });
  }
});

// POST /api/billing/create-portal-session - Create billing portal session
router.post('/create-portal-session', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User must belong to an organization'
      });
    }

    const organization = await database.get(
      'SELECT stripe_customer_id FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!organization?.stripe_customer_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No billing account found'
      });
    }

    const session = await stripeService.createPortalSession({
      customerId: organization.stripe_customer_id,
      returnUrl: `${process.env.FRONTEND_URL}/billing`
    });

    res.json({ sessionUrl: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create billing portal session'
    });
  }
});

// GET /api/billing/subscription - Get current subscription details
router.get('/subscription', async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User must belong to an organization'
      });
    }

    const organization = await database.get(
      'SELECT * FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        message: 'Organization does not exist'
      });
    }

    let subscriptionDetails = null;

    if (organization.stripe_customer_id) {
      subscriptionDetails = await stripeService.getSubscriptionDetails(
        organization.stripe_customer_id
      );
    }

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        plan_type: organization.plan_type,
        subscription_status: organization.subscription_status,
        trial_ends_at: organization.trial_ends_at
      },
      subscription: subscriptionDetails
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch subscription details'
    });
  }
});

// GET /api/billing/invoices - Get invoice history
router.get('/invoices', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const limit = parseInt(req.query.limit) || 10;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User must belong to an organization'
      });
    }

    const organization = await database.get(
      'SELECT stripe_customer_id FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!organization?.stripe_customer_id) {
      return res.json({ invoices: [] });
    }

    const invoices = await stripeService.getCustomerInvoices(
      organization.stripe_customer_id,
      limit
    );

    res.json({ invoices });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invoices'
    });
  }
});

// GET /api/billing/usage - Get current usage stats
router.get('/usage', async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User must belong to an organization'
      });
    }

    // Get usage statistics
    const [employeeCount, scheduleCount] = await Promise.all([
      database.get('SELECT COUNT(*) as count FROM employees WHERE organization_id = ? AND status = "active"', [organizationId]),
      database.get('SELECT COUNT(*) as count FROM schedules WHERE organization_id = ?', [organizationId])
    ]);

    const organization = await database.get(
      'SELECT plan_type FROM organizations WHERE id = ?',
      [organizationId]
    );

    const planLimits = PLANS[organization?.plan_type] || PLANS.STARTER;

    res.json({
      usage: {
        employees: employeeCount.count,
        schedules: scheduleCount.count
      },
      limits: {
        maxEmployees: planLimits.features.maxEmployees,
        maxSchedules: planLimits.features.maxSchedules
      },
      plan: organization?.plan_type || 'STARTER'
    });

  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch usage statistics'
    });
  }
});

module.exports = router;