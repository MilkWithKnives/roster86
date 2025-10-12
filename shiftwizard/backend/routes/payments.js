const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { authenticateToken } = require('../middleware/auth');
const database = require('../models/database');

// Initialize Stripe with secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { priceId, planName } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!priceId || !planName) {
            return res.status(400).json({
                error: 'Missing required fields: priceId and planName'
            });
        }

        // Get user details
        const user = await database.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create or retrieve Stripe customer
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.full_name,
                metadata: {
                    userId: userId.toString()
                }
            });
            customerId = customer.id;

            // Save customer ID to database
            await database.updateUserStripeCustomerId(userId, customerId);
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
            metadata: {
                userId: userId.toString(),
                planName: planName
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            message: error.message
        });
    }
});

/**
 * POST /api/payments/create-payment-intent
 * Create a one-time payment intent
 */
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { amount, currency = 'usd', description } = req.body;
        const userId = req.user.id;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const user = await database.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            customer: user.stripe_customer_id,
            description: description || 'Roster86 payment',
            metadata: {
                userId: userId.toString()
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            message: error.message
        });
    }
});

/**
 * GET /api/payments/subscription-status
 * Get current user's subscription status
 */
router.get('/subscription-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await database.getUserById(userId);

        if (!user || !user.stripe_customer_id) {
            return res.json({
                hasSubscription: false,
                plan: 'free'
            });
        }

        // Retrieve customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.json({
                hasSubscription: false,
                plan: 'free'
            });
        }

        const subscription = subscriptions.data[0];
        const product = await stripe.products.retrieve(
            subscription.items.data[0].price.product
        );

        res.json({
            hasSubscription: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                plan: product.name,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            }
        });

    } catch (error) {
        console.error('Error fetching subscription status:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription status',
            message: error.message
        });
    }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel user's subscription
 */
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await database.getUserById(userId);

        if (!user || !user.stripe_customer_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel at period end (don't immediately cancel)
        const subscription = await stripe.subscriptions.update(
            subscriptions.data[0].id,
            { cancel_at_period_end: true }
        );

        res.json({
            message: 'Subscription will be canceled at the end of the billing period',
            subscription: {
                id: subscription.id,
                cancelAt: subscription.cancel_at,
                currentPeriodEnd: subscription.current_period_end
            }
        });

    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            message: error.message
        });
    }
});

/**
 * POST /api/payments/portal-session
 * Create a Stripe Customer Portal session for managing subscription
 */
router.post('/portal-session', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await database.getUserById(userId);

        if (!user || !user.stripe_customer_id) {
            return res.status(404).json({ error: 'No Stripe customer found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/settings`,
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({
            error: 'Failed to create portal session',
            message: error.message
        });
    }
});

module.exports = router;
