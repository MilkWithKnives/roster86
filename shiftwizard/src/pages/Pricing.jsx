import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const plans = {
  monthly: [
    {
      name: "Free",
      price: "$0",
      description: "For individuals and small teams getting started.",
      features: [
        "1 location",
        "Up to 10 employees",
        "Shift templates",
        "Manual schedule builder"
      ],
      cta: "Get Started",
      planId: "free",
    },
    {
      name: "Pro",
      price: "$49",
      description: "For growing businesses that need to schedule smarter.",
      features: [
        "Up to 5 locations",
        "Up to 50 employees",
        "Auto-fill schedules",
        "Labor cost tracking",
        "PDF & CSV exports"
      ],
      cta: "Choose Pro",
      planId: "pro",
      popular: true,
    },
    {
      name: "Premium",
      price: "$99",
      description: "For established businesses that require advanced tools.",
      features: [
        "Unlimited locations",
        "Unlimited employees",
        "Google Calendar sync",
        "SMS & Email notifications",
        "Labor forecasting dashboard"
      ],
      cta: "Choose Premium",
      planId: "premium",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with specific needs.",
      features: [
        "Everything in Premium",
        "Dedicated account manager",
        "Custom integrations",
        "Single Sign-On (SSO)",
        "Advanced security & compliance"
      ],
      cta: "Contact Sales",
      planId: "enterprise",
    }
  ],
  yearly: [
    {
      name: "Free",
      price: "$0",
      description: "For individuals and small teams getting started.",
      features: [
        "1 location",
        "Up to 10 employees",
        "Shift templates",
        "Manual schedule builder"
      ],
      cta: "Get Started",
      planId: "free",
    },
    {
      name: "Pro",
      price: "$39",
      description: "For growing businesses that need to schedule smarter.",
      features: [
        "Up to 5 locations",
        "Up to 50 employees",
        "Auto-fill schedules",
        "Labor cost tracking",
        "PDF & CSV exports"
      ],
      cta: "Choose Pro",
      planId: "pro-yearly",
      popular: true,
    },
    {
      name: "Premium",
      price: "$79",
      description: "For established businesses that require advanced tools.",
      features: [
        "Unlimited locations",
        "Unlimited employees",
        "Google Calendar sync",
        "SMS & Email notifications",
        "Labor forecasting dashboard"
      ],
      cta: "Choose Premium",
      planId: "premium-yearly",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with specific needs.",
      features: [
        "Everything in Premium",
        "Dedicated account manager",
        "Custom integrations",
        "Single Sign-On (SSO)",
        "Advanced security & compliance"
      ],
      cta: "Contact Sales",
      planId: "enterprise",
    }
  ],
};

const PricingCard = ({ plan, billingCycle }) => {
  return (
    <div className={`premium-card p-8 rounded-3xl h-full flex flex-col relative ${plan.popular ? 'border-2 border-purple-400 shadow-strong' : ''}`}>
      {plan.popular && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
          <div className="gradient-secondary text-white px-4 py-1.5 rounded-full text-sm font-semibold">
            Most Popular
          </div>
        </div>
      )}
      <div className="flex-grow">
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>{plan.description}</p>
        
        <div className="flex items-baseline gap-2 mb-8">
          <span className="text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{plan.price}</span>
          {plan.price !== "Custom" && plan.price !== "$0" && (
            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>/ month</span>
          )}
        </div>

        <ul className="space-y-4">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <Link to={createPageUrl(`Dashboard?plan=${plan.planId}`)} className="w-full">
          <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-transform duration-300 ${plan.popular ? 'gradient-primary text-white hover:scale-105' : 'modern-button hover:bg-white/20'}`}>
            {plan.cta}
          </button>
        </Link>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <div className="min-h-screen w-full p-4 md:p-8" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Find the perfect plan
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Start for free, then upgrade to a plan that fits your business as you grow.
          </p>
        </header>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-white/60'}`}>
            Monthly
          </span>
          <div 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-14 h-8 rounded-full p-1 flex items-center cursor-pointer transition-colors duration-300 ${billingCycle === 'monthly' ? 'bg-purple-600' : 'bg-pink-500'}`}
          >
            <div 
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`}
            />
          </div>
          <span className={`font-medium ${billingCycle === 'yearly' ? 'text-white' : 'text-white/60'}`}>
            Yearly
          </span>
          <span className="gradient-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
            Save 20%
          </span>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch">
          {plans[billingCycle].map((plan, index) => (
            <div key={index} className={plan.popular ? 'lg:scale-105' : ''}>
              <PricingCard plan={plan} billingCycle={billingCycle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}