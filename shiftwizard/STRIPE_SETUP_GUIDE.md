# Stripe Payment Setup Guide for Roster86

## 🚀 Quick Setup Steps

### 1. Create Stripe Account & Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or sign in
3. Navigate to **Developers > API keys**
4. Copy your **Publishable key** and **Secret key**

### 2. Create Products and Prices in Stripe

#### Create Products:
1. Go to **Products** in Stripe Dashboard
2. Click **Add product** for each plan:

**Starter Plan:**
- Name: `Roster86 Starter`
- Description: `Perfect for small teams and individual users`
- Monthly Price: `$29/month`
- Yearly Price: `$290/year`

**Professional Plan:**
- Name: `Roster86 Professional` 
- Description: `For growing businesses that need advanced features`
- Monthly Price: `$79/month`
- Yearly Price: `$790/year`

**Enterprise Plan:**
- Name: `Roster86 Enterprise`
- Description: `For large organizations with complex needs`
- Monthly Price: `$199/month`
- Yearly Price: `$1990/year`

#### Get Price IDs:
After creating each price, copy the Price ID (starts with `price_`)

### 3. Set Up Webhooks

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
DATABASE_URL=./database.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (Replace with your actual Price IDs)
STRIPE_STARTER_PRICE_ID=price_1234567890
STRIPE_STARTER_YEARLY_PRICE_ID=price_0987654321
STRIPE_PROFESSIONAL_PRICE_ID=price_1111111111
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_2222222222
STRIPE_ENTERPRISE_PRICE_ID=price_3333333333
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_4444444444
```

### 5. Update Frontend Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe Price IDs for frontend
VITE_STRIPE_STARTER_MONTHLY=price_1234567890
VITE_STRIPE_STARTER_YEARLY=price_0987654321
VITE_STRIPE_PRO_MONTHLY=price_1111111111
VITE_STRIPE_PRO_YEARLY=price_2222222222
VITE_STRIPE_ENTERPRISE_MONTHLY=price_3333333333
VITE_STRIPE_ENTERPRISE_YEARLY=price_4444444444
```

### 6. Test the Integration

1. Start the backend server:
   ```bash
   cd backend && npm start
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Go to `/purchase` page and test the payment flow

## 🔧 Production Setup

### For Production Deployment:

1. **Use Live Stripe Keys:**
   - Replace test keys with live keys
   - Update webhook endpoint to production URL
   - Test with real payment methods

2. **Security:**
   - Use strong JWT secrets
   - Enable HTTPS
   - Set up proper CORS
   - Use environment-specific configurations

3. **Monitoring:**
   - Set up Stripe Dashboard monitoring
   - Configure webhook retry logic
   - Set up error tracking (Sentry)

## 🧪 Testing

### Test Cards (Stripe Test Mode):
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3D Secure: `4000 0025 0000 3155`

### Test Webhooks Locally:
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## 🚨 Troubleshooting

### Common Issues:

1. **"Price ID not found"**
   - Check that Price IDs are correct in environment variables
   - Ensure products are created in Stripe Dashboard

2. **"Webhook signature verification failed"**
   - Verify webhook secret is correct
   - Check that webhook endpoint is accessible

3. **"Customer not found"**
   - Ensure user has been created in database
   - Check Stripe customer creation logic

4. **"Invalid amount"**
   - Verify price amounts are in cents
   - Check currency format

## 📞 Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For Roster86 integration issues:
- Check the logs in `backend/logs/`
- Verify database connections
- Test API endpoints manually
