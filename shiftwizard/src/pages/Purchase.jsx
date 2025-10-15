import { useState, useEffect } from 'react';
import { Check, Star, Shield, Clock, Users, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createCheckoutSession, getSubscriptionStatus } from '@/api/payments';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const plans = {
  starter: {
    name: "Starter",
    price: 29,
    yearlyPrice: 290,
    description: "Perfect for small teams and individual users",
    features: [
      "Up to 25 employees",
      "10 schedules per month",
      "Basic scheduling tools",
      "Email support",
      "Mobile app access",
      "Standard templates"
    ],
    limitations: [
      "No advanced reports",
      "No API access",
      "No custom integrations"
    ],
    stripePriceId: {
      monthly: process.env.VITE_STRIPE_STARTER_MONTHLY || 'price_starter_monthly',
      yearly: process.env.VITE_STRIPE_STARTER_YEARLY || 'price_starter_yearly'
    }
  },
  professional: {
    name: "Professional",
    price: 79,
    yearlyPrice: 790,
    description: "For growing businesses that need advanced features",
    features: [
      "Up to 100 employees",
      "50 schedules per month",
      "AI-powered auto scheduling",
      "Advanced analytics & reports",
      "API access",
      "Priority support",
      "Custom integrations",
      "Time tracking",
      "Labor cost optimization"
    ],
    limitations: [
      "Limited custom integrations"
    ],
    stripePriceId: {
      monthly: process.env.VITE_STRIPE_PRO_MONTHLY || 'price_pro_monthly',
      yearly: process.env.VITE_STRIPE_PRO_YEARLY || 'price_pro_yearly'
    },
    popular: true
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    yearlyPrice: 1990,
    description: "For large organizations with complex needs",
    features: [
      "Unlimited employees",
      "Unlimited schedules",
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "Single Sign-On (SSO)",
      "Advanced security & compliance",
      "White-label options",
      "24/7 phone support",
      "SLA guarantee"
    ],
    limitations: [],
    stripePriceId: {
      monthly: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
      yearly: process.env.VITE_STRIPE_ENTERPRISE_YEARLY || 'price_enterprise_yearly'
    }
  }
};

const PlanCard = ({ plan, billingCycle, onSelectPlan, loading, currentPlan }) => {
  const isCurrentPlan = currentPlan === plan.name.toLowerCase();
  const isPopular = plan.popular;
  
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
  const displayPrice = billingCycle === 'yearly' ? Math.round(price / 12) : price;
  
  return (
    <Card className={`relative h-full transition-all duration-300 hover:scale-105 ${
      isCurrentPlan ? 'border-green-500 bg-green-50/10' : 
      isPopular ? 'border-purple-500 shadow-xl' : 'border-gray-200'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
            <Star className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-4 py-1">
            <Check className="w-3 h-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
        <p className="text-gray-600 mt-2">{plan.description}</p>
        
        <div className="mt-6">
          <div className="flex items-baseline justify-center">
            <span className="text-5xl font-bold text-gray-900">${displayPrice}</span>
            <span className="text-gray-500 ml-1">/month</span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-sm text-green-600 mt-1">
              Billed annually (${plan.yearlyPrice}/year) - Save ${(plan.price * 12) - plan.yearlyPrice}!
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        {plan.limitations.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Limitations:</p>
            <ul className="space-y-1">
              {plan.limitations.map((limitation, index) => (
                <li key={index} className="text-sm text-gray-400 flex items-start">
                  <span className="mr-2">•</span>
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          onClick={() => onSelectPlan(plan)}
          disabled={loading || isCurrentPlan}
          className={`w-full ${
            isCurrentPlan ? 'bg-green-500 hover:bg-green-600' :
            isPopular ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' :
            'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            <>
              Choose {plan.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const FeatureComparison = () => {
  const features = [
    {
      category: "Core Features",
      items: [
        { name: "Employee Management", starter: true, pro: true, enterprise: true },
        { name: "Schedule Templates", starter: true, pro: true, enterprise: true },
        { name: "Basic Scheduling", starter: true, pro: true, enterprise: true },
        { name: "Mobile App", starter: true, pro: true, enterprise: true }
      ]
    },
    {
      category: "Advanced Features",
      items: [
        { name: "AI Auto-Scheduling", starter: false, pro: true, enterprise: true },
        { name: "Advanced Analytics", starter: false, pro: true, enterprise: true },
        { name: "Labor Cost Optimization", starter: false, pro: true, enterprise: true },
        { name: "Time Tracking", starter: false, pro: true, enterprise: true }
      ]
    },
    {
      category: "Integrations & API",
      items: [
        { name: "API Access", starter: false, pro: true, enterprise: true },
        { name: "Custom Integrations", starter: false, pro: "Limited", enterprise: true },
        { name: "Single Sign-On", starter: false, pro: false, enterprise: true },
        { name: "White-label Options", starter: false, pro: false, enterprise: true }
      ]
    },
    {
      category: "Support & Security",
      items: [
        { name: "Email Support", starter: true, pro: true, enterprise: true },
        { name: "Priority Support", starter: false, pro: true, enterprise: true },
        { name: "24/7 Phone Support", starter: false, pro: false, enterprise: true },
        { name: "Dedicated Manager", starter: false, pro: false, enterprise: true },
        { name: "SLA Guarantee", starter: false, pro: false, enterprise: true }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
        Feature Comparison
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-2 font-semibold text-gray-900">Features</th>
              <th className="text-center py-4 px-2 font-semibold text-gray-900">Starter</th>
              <th className="text-center py-4 px-2 font-semibold text-purple-600">Professional</th>
              <th className="text-center py-4 px-2 font-semibold text-blue-600">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {features.map((category, categoryIndex) => (
              <React.Fragment key={categoryIndex}>
                <tr className="bg-gray-50">
                  <td colSpan="4" className="py-3 px-2 font-semibold text-gray-800">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, itemIndex) => (
                  <tr key={itemIndex} className="border-b border-gray-100">
                    <td className="py-3 px-2 text-gray-700">{item.name}</td>
                    <td className="text-center py-3 px-2">
                      {item.starter === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {item.pro === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : item.pro === "Limited" ? (
                        <span className="text-yellow-600 text-sm">Limited</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {item.enterprise === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function PurchasePage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check current subscription status
    const checkSubscription = async () => {
      try {
        const status = await getSubscriptionStatus();
        if (status.hasSubscription) {
          setCurrentPlan(status.subscription.plan.toLowerCase());
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    checkSubscription();

    // Handle success/cancel from Stripe
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success) {
      toast({
        title: 'Payment Successful!',
        description: 'Your subscription has been activated. Welcome to Roster86!',
        variant: 'default'
      });
      navigate('/dashboard');
    }
    
    if (canceled) {
      toast({
        title: 'Payment Canceled',
        description: 'No charges were made. You can try again anytime.',
        variant: 'destructive'
      });
    }
  }, [searchParams, navigate, toast]);

  const handleSelectPlan = async (plan) => {
    setLoading(true);
    try {
      const priceId = plan.stripePriceId[billingCycle];
      
      if (!priceId || priceId.includes('price_')) {
        toast({
          title: 'Configuration Error',
          description: 'This plan is not yet available. Please contact support.',
          variant: 'destructive'
        });
        return;
      }

      const { url } = await createCheckoutSession(priceId, plan.name);
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate checkout. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent ml-4">
              Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start free, then upgrade as you grow. All plans include our core scheduling features 
            with no hidden fees or setup costs.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
                billingCycle === 'monthly' ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div 
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge className="bg-green-500 text-white px-3 py-1">
                Save up to 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="font-medium">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-medium">14-day Free Trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Instant Setup</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {Object.entries(plans).map(([key, plan]) => (
            <PlanCard
              key={key}
              plan={plan}
              billingCycle={billingCycle}
              onSelectPlan={handleSelectPlan}
              loading={loading}
              currentPlan={currentPlan}
            />
          ))}
        </div>

        {/* Feature Comparison */}
        <FeatureComparison />

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h4>
              <p className="text-gray-600">No setup fees! All plans include free onboarding and migration assistance.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Can I get a refund?</h4>
              <p className="text-gray-600">We offer a 30-day money-back guarantee for all paid plans.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h3>
          <p className="text-gray-600 mb-6">
            Join thousands of businesses already using Roster86 to streamline their scheduling.
          </p>
          <Button
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
          >
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
