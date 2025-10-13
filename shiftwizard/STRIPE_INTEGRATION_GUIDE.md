# Stripe Payment Integration Guide

## Overview
Your Roster86 ShiftWizard application now has full Stripe payment processing integrated! This guide explains what was done and what you need to configure.

---

## ✅ What's Been Implemented

### 1. Backend Payment Processing
- **Payment Routes** (`backend/routes/payments.js`):
  - `POST /api/payments/create-checkout-session` - Creates Stripe Checkout session
  - `POST /api/payments/create-payment-intent` - One-time payments
  - `GET /api/payments/subscription-status` - Get user's subscription info
  - `POST /api/payments/cancel-subscription` - Cancel subscription
  - `POST /api/payments/portal-session` - Customer portal for managing subscription

### 2. Webhook Handling
- **Webhook Routes** (`backend/routes/webhooks.js`):
  - Handles Stripe events: checkout completion, subscription updates, payment success/failure
  - Auto-updates user subscription status in database
  - **Endpoint**: `/api/webhooks/stripe`

### 3. Database Updates
- **New columns added to `users` table**:
  - `stripe_customer_id` - Links user to Stripe customer
  - `subscription_id` - Current subscription ID
  - `subscription_status` - Status (free, active, past_due, canceled)
  - `subscription_plan` - Plan name (free, pro, premium)

### 4. Frontend Integration
- **Payment API** (`src/api/payments.js`):
  - Helper functions for all payment operations
  - Automatic auth token handling
- **Updated Pricing Page** (`src/pages/Pricing.jsx`):
  - Integrated Stripe Checkout
  - Handles plan selection and redirects to Stripe
  - Loading states and error handling

---

## 🔧 Required Configuration

### Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > API keys**
3. Copy your **Publishable key** and **Secret key**

### Step 2: Update Environment Variables

#### Backend (`backend/.env`):
```bash
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_...  # Will get this in Step 4
```

#### Frontend (`.env.local`):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe Publishable Key
VITE_API_URL=http://localhost:3001  # Or your production backend URL
```

### Step 3: Create Products & Prices in Stripe

1. In Stripe Dashboard, go to **Products**
2. Create products for each plan:

**Pro Plan (Monthly)**
- Name: "Pro Plan"
- Price: $49/month
- Billing: Recurring monthly
- Copy the **Price ID** (starts with `price_...`)

**Pro Plan (Yearly)**
- Name: "Pro Plan"
- Price: $39/month (or $468/year)
- Billing: Recurring yearly
- Copy the **Price ID**

**Premium Plan (Monthly)**
- Name: "Premium Plan"
- Price: $99/month
- Billing: Recurring monthly
- Copy the **Price ID**

**Premium Plan (Yearly)**
- Name: "Premium Plan"
- Price: $79/month (or $948/year)
- Billing: Recurring yearly
- Copy the **Price ID**

### Step 4: Update Price IDs in Code

In `src/pages/Pricing.jsx`, replace the placeholder Price IDs:

```javascript
const stripePriceIds = {
  'pro': 'price_YOUR_PRO_MONTHLY_ID',
  'pro-yearly': 'price_YOUR_PRO_YEARLY_ID',
  'premium': 'price_YOUR_PREMIUM_MONTHLY_ID',
  'premium-yearly': 'price_YOUR_PREMIUM_YEARLY_ID',
};
```

### Step 5: Set Up Stripe Webhooks

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**:
   - Local development: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local testing
   - Production: `https://your-domain.com/api/webhooks/stripe`

4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to `backend/.env` as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Testing

### Test Mode
Stripe provides test card numbers for testing:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# This will give you a webhook secret starting with whsec_
# Add it to your backend .env file
```

### Test the Payment Flow

1. Start your backend:
```bash
cd backend
npm start
```

2. Start your frontend:
```bash
npm run dev
```

3. Go to `/pricing` page
4. Click on a paid plan (Pro or Premium)
5. You'll be redirected to Stripe Checkout
6. Use test card `4242 4242 4242 4242`
7. Complete the checkout
8. You'll be redirected back to `/dashboard?session_id=...&success=true`

---

## 📝 How the Payment Flow Works

### 1. User selects a plan
- User clicks "Choose Pro" or "Choose Premium"
- Frontend calls `/api/payments/create-checkout-session`
- Backend creates a Stripe Checkout Session
- User is redirected to Stripe's hosted checkout page

### 2. User completes payment
- User enters card details on Stripe's secure page
- Stripe processes the payment
- User is redirected back to your app

### 3. Webhook handles the result
- Stripe sends webhook event to `/api/webhooks/stripe`
- Backend verifies the webhook signature
- User's subscription is updated in the database
- User now has access to paid features

---

## 🛡️ Security Notes

- ✅ **Never expose your Secret Key** - Keep it in `.env` files only
- ✅ **Always verify webhook signatures** - Already implemented
- ✅ **Use HTTPS in production** - Required for webhooks
- ✅ **PCI Compliance** - Stripe handles card data, you never see it

---

## 🚀 Going to Production

### 1. Switch to Live Mode
- Get Live API keys from Stripe Dashboard
- Create live products and prices
- Update webhook endpoint to production URL

### 2. Update Environment Variables
- Use live Stripe keys (start with `pk_live_...` and `sk_live_...`)
- Update `FRONTEND_URL` in backend `.env`
- Update `VITE_API_URL` in frontend `.env`

### 3. Deploy
- Deploy backend with updated `.env`
- Deploy frontend with updated `.env.local`
- Configure webhook endpoint in Stripe Dashboard

---

## 📚 Additional Features You Can Add

### Customer Portal
Users can manage their subscription via Stripe's Customer Portal:
```javascript
import { createPortalSession } from '@/api/payments';

const handleManageSubscription = async () => {
  const { url } = await createPortalSession();
  window.location.href = url;
};
```

### Subscription Status Display
Check if user has an active subscription:
```javascript
import { getSubscriptionStatus } from '@/api/payments';

const { hasSubscription, subscription } = await getSubscriptionStatus();
if (hasSubscription) {
  console.log(`Plan: ${subscription.plan}`);
  console.log(`Status: ${subscription.status}`);
}
```

---

## 🆘 Troubleshooting

### Webhooks not working?
- Check webhook signing secret is correct
- Ensure endpoint URL is accessible
- Check backend logs for errors
- Use Stripe CLI for local testing

### Checkout session fails?
- Verify Secret Key is correct
- Check user is authenticated
- Ensure Price IDs are correct

### User not upgraded after payment?
- Check webhook events in Stripe Dashboard
- Verify webhook endpoint is receiving events
- Check database for subscription updates

---

## 📞 Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For integration issues:
- Check backend logs
- Test with Stripe CLI
- Verify all environment variables are set

---

## ✨ Summary

You now have a complete payment system with:
- ✅ Stripe Checkout integration
- ✅ Subscription management
- ✅ Webhook handling
- ✅ Database synchronization
- ✅ Frontend payment UI

**Next steps**: Configure your Stripe account, add your API keys, and you're ready to accept payments!
