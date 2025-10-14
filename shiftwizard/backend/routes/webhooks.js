const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const database = require('../models/database');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This route must use express.raw() instead of express.json()
 * to verify the webhook signature
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Received Stripe event:', event.type);

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Error handling webhook event:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session) {
    console.log('Checkout session completed:', session.id);

    const organizationId = session.metadata?.organizationId;
    const customerId = session.customer;

    if (organizationId) {
        // Update organization with Stripe customer ID if not already set
        await database.run(
            `UPDATE organizations 
             SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND stripe_customer_id IS NULL`,
            [customerId, parseInt(organizationId)]
        );

        console.log(`Checkout completed for organization ${organizationId}`);
    }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);

    const organizationId = subscription.metadata?.organizationId;
    
    if (organizationId) {
        // Determine plan type from price ID
        const priceId = subscription.items.data[0]?.price?.id;
        let planType = 'STARTER'; // default
        
        if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
            planType = 'PROFESSIONAL';
        } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            planType = 'ENTERPRISE';
        }

        await database.run(
            `UPDATE organizations SET 
             subscription_id = ?, 
             subscription_status = ?, 
             plan_type = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [subscription.id, subscription.status, planType, parseInt(organizationId)]
        );

        console.log(`Subscription created for organization ${organizationId}, plan: ${planType}`);
    } else {
        // Fallback: try to find organization by customer ID
        const organization = await database.get(
            'SELECT id FROM organizations WHERE stripe_customer_id = ?',
            [subscription.customer]
        );
        
        if (organization) {
            await handleSubscriptionCreated({
                ...subscription,
                metadata: { organizationId: organization.id }
            });
        }
    }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);

    const user = await database.getUserByStripeCustomerId(subscription.customer);

    if (user) {
        await database.updateUserSubscription(user.id, {
            subscriptionId: subscription.id,
            status: subscription.status,
            planName: subscription.items.data[0]?.price?.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
    }
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);

    const user = await database.getUserByStripeCustomerId(subscription.customer);

    if (user) {
        await database.updateUserSubscription(user.id, {
            subscriptionId: null,
            status: 'canceled',
            planName: 'free'
        });
    }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Invoice payment succeeded:', invoice.id);

    const user = await database.getUserByStripeCustomerId(invoice.customer);

    if (user) {
        // Update subscription status to active
        await database.updateUserSubscription(user.id, {
            status: 'active',
            lastPaymentDate: new Date(invoice.status_transitions.paid_at * 1000)
        });
    }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log('Invoice payment failed:', invoice.id);

    const user = await database.getUserByStripeCustomerId(invoice.customer);

    if (user) {
        // Update subscription status
        await database.updateUserSubscription(user.id, {
            status: 'past_due'
        });

        // TODO: Send notification email to user about failed payment
    }
}

module.exports = router;
