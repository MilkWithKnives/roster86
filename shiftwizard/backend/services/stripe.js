const { stripe, PLANS, getPlanByPriceId } = require('../config/stripe');
const database = require('../models/database');

class StripeService {
  
  // Create a new customer in Stripe
  async createCustomer({ organizationName, email, organizationId }) {
    try {
      const customer = await stripe.customers.create({
        name: organizationName,
        email: email,
        metadata: {
          organizationId: organizationId.toString()
        }
      });

      // Update organization with Stripe customer ID
      await database.run(
        'UPDATE organizations SET stripe_customer_id = ? WHERE id = ?',
        [customer.id, organizationId]
      );

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Create a checkout session for subscription
  async createCheckoutSession({ organizationId, priceId, customerId, successUrl, cancelUrl }) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId: organizationId.toString()
        },
        subscription_data: {
          trial_period_days: 14, // 14-day free trial
          metadata: {
            organizationId: organizationId.toString()
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Create a billing portal session
  async createPortalSession({ customerId, returnUrl }) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  // Handle successful subscription creation
  async handleSubscriptionCreated(subscription) {
    try {
      const organizationId = subscription.metadata.organizationId;
      const plan = getPlanByPriceId(subscription.items.data[0].price.id);
      
      await database.run(
        `UPDATE organizations SET 
         subscription_id = ?, 
         subscription_status = ?, 
         plan_type = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          subscription.id, 
          subscription.status,
          plan ? plan.name.toUpperCase() : 'STARTER',
          organizationId
        ]
      );

      console.log(`Subscription created for organization ${organizationId}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  // Handle subscription updates
  async handleSubscriptionUpdated(subscription) {
    try {
      const organizationId = subscription.metadata.organizationId;
      const plan = getPlanByPriceId(subscription.items.data[0].price.id);
      
      await database.run(
        `UPDATE organizations SET 
         subscription_status = ?, 
         plan_type = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          subscription.status,
          plan ? plan.name.toUpperCase() : 'STARTER',
          organizationId
        ]
      );

      console.log(`Subscription updated for organization ${organizationId}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  // Handle subscription deletion/cancellation
  async handleSubscriptionDeleted(subscription) {
    try {
      const organizationId = subscription.metadata.organizationId;
      
      await database.run(
        `UPDATE organizations SET 
         subscription_status = 'canceled',
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [organizationId]
      );

      console.log(`Subscription canceled for organization ${organizationId}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  // Get customer's subscription details
  async getSubscriptionDetails(customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1
      });

      return subscriptions.data[0] || null;
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      return null;
    }
  }

  // Get customer's invoices
  async getCustomerInvoices(customerId, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: limit
      });

      return invoices.data;
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      return [];
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}

module.exports = new StripeService();