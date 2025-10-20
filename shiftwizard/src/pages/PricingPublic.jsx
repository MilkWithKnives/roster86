import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPublic() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'Starter',
      price: billingCycle === 'monthly' ? 0 : 0,
      period: '/month',
      description: 'For individuals who like to keep it simple and fun.',
      cta: 'Get started',
      ctaStyle: 'border border-gray-300 text-gray-900 hover:bg-gray-50',
      features: [
        'Up to 10 team members',
        'Basic scheduling',
        '1 location',
        'Email notifications',
        'Mobile app access',
        'Standard support'
      ]
    },
    {
      name: 'Pro',
      price: billingCycle === 'monthly' ? 49 : 39,
      period: '/month',
      description: 'For companies/startups and scaling businesses.',
      cta: 'Try for free',
      ctaStyle: 'bg-blue-500 text-white hover:bg-blue-600',
      popular: true,
      features: [
        'Up to 100 team members',
        'AI-powered auto scheduling',
        '5 locations',
        'Advanced shift patterns',
        'Time-off management',
        'Priority support',
        '24/7 customer service',
        'Advanced analytics'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For organizations with custom needs and advanced security.',
      cta: 'Contact sales',
      ctaStyle: 'border border-gray-300 text-gray-900 hover:bg-gray-50',
      features: [
        'Unlimited team members',
        'Unlimited locations',
        'Custom integrations',
        'Dedicated account manager',
        'Advanced security & compliance',
        'Custom reporting',
        'SLA guarantee',
        'On-premise deployment option'
      ]
    }
  ];

  const comparisonFeatures = [
    {
      category: 'Scheduling',
      features: [
        { name: 'Team members', starter: '10', pro: '100', enterprise: 'Unlimited' },
        { name: 'Locations', starter: '1', pro: '5', enterprise: 'Unlimited' },
        { name: 'Shift templates', starter: '5', pro: '50', enterprise: 'Unlimited' },
        { name: 'AI auto-scheduling', starter: false, pro: true, enterprise: true },
        { name: 'Drag & drop editor', starter: true, pro: true, enterprise: true },
        { name: 'Recurring shifts', starter: true, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Features',
      features: [
        { name: 'Time-off requests', starter: true, pro: true, enterprise: true },
        { name: 'Shift swapping', starter: false, pro: true, enterprise: true },
        { name: 'Conflict detection', starter: 'Basic', pro: 'Advanced', enterprise: 'Advanced with AI' },
        { name: 'Availability tracking', starter: false, pro: true, enterprise: true },
        { name: 'Labor cost tracking', starter: false, pro: true, enterprise: true },
        { name: 'Custom roles & permissions', starter: false, pro: true, enterprise: true },
        { name: 'Overtime alerts', starter: false, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Integrations',
      features: [
        { name: 'Calendar sync (Google, Outlook)', starter: true, pro: true, enterprise: true },
        { name: 'Slack integration', starter: false, pro: true, enterprise: true },
        { name: 'Payroll integration', starter: false, pro: 'Basic', enterprise: 'Advanced' },
        { name: 'API access', starter: false, pro: 'Limited', enterprise: 'Unlimited' },
        { name: 'Custom webhooks', starter: false, pro: false, enterprise: true }
      ]
    },
    {
      category: 'Support',
      features: [
        { name: 'Email support', starter: true, pro: true, enterprise: true },
        { name: 'Priority support', starter: false, pro: true, enterprise: true },
        { name: 'Phone support', starter: false, pro: true, enterprise: true },
        { name: 'Dedicated account manager', starter: false, pro: false, enterprise: true },
        { name: 'Response time SLA', starter: '48 hours', pro: '24 hours', enterprise: '4 hours' }
      ]
    }
  ];

  const faqs = [
    {
      question: 'What is Roster86?',
      answer: 'Roster86 is an AI-powered auto scheduling platform designed to help businesses manage their team schedules efficiently. Our software automatically creates optimal schedules based on employee availability, preferences, and business requirements.'
    },
    {
      question: 'How does the free trial work?',
      answer: 'You can try our Pro plan free for 14 days with no credit card required. During the trial, you\'ll have access to all Pro features. After the trial ends, you can choose to upgrade to a paid plan or downgrade to our free Starter plan.'
    },
    {
      question: 'Can I upgrade my plan later?',
      answer: 'Absolutely! You can upgrade or downgrade your plan at any time from your account settings. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the end of your current billing cycle.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. Enterprise customers can also pay via invoice and bank transfer.'
    },
    {
      question: 'Is there a limit on the number of schedules?',
      answer: 'No, there\'s no limit on the number of schedules you can create on any plan. The limits apply to team members, locations, and certain advanced features based on your plan tier.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => navigate('/')}>ROSTER86</div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
            <a href="/#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="/pricing-public" className="text-gray-900 font-medium">Pricing</a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900">Login</button>
            <button onClick={() => navigate('/register')} className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">Sign up</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">Pricing</span>
        <h1 className="text-5xl font-bold text-gray-900 mt-6 mb-4">
          Start scheduling your team today for free
        </h1>
        <p className="text-lg text-gray-600">
          From everything on Roster86 for free. Upgrade for unlimited storage and AI-powered security, web design and calculated auto-price features.
        </p>
      </section>

      {/* Billing Toggle */}
      <div className="max-w-7xl mx-auto px-6 pb-12 flex justify-center">
        <div className="inline-flex items-center gap-4 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md font-medium transition-all relative ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              Save 33%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 relative ${
                plan.popular
                  ? 'bg-blue-50 border-2 border-blue-500 shadow-xl'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  {plan.price === 'Custom' ? (
                    <span className="text-4xl font-bold text-gray-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>

              <button onClick={() => navigate('/register')} className={`w-full py-3 px-4 rounded-lg font-medium mb-6 transition-all ${plan.ctaStyle}`}>
                {plan.cta}
              </button>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {plan.name === 'Starter' ? 'For free you get:' :
                   plan.name === 'Pro' ? 'Everything in Starter, plus:' :
                   'Everything in Pro, plus:'}
                </p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Compare our plans</h2>
          <div className="flex items-center gap-3">
            <span className="text-gray-600">Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-gray-600">Yearly</span>
          </div>
        </div>

        <div className="bg-white border-2 border-blue-500 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
            <div></div>
            <div className="text-center">
              <div className="font-bold text-gray-900">Starter</div>
              <div className="text-sm text-gray-600">$0/month</div>
              <button onClick={() => navigate('/register')} className="mt-2 w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Get started
              </button>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-900">Pro</div>
              <div className="text-sm text-gray-600">${billingCycle === 'yearly' ? '39' : '49'}/month</div>
              <button onClick={() => navigate('/register')} className="mt-2 w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
                Try for free
              </button>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-900">Enterprise</div>
              <div className="text-sm text-gray-600">Custom</div>
              <button onClick={() => navigate('/register')} className="mt-2 w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Contact sales
              </button>
            </div>
          </div>

          {/* Table Body */}
          {comparisonFeatures.map((category, catIndex) => (
            <div key={catIndex}>
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">{category.category}</h3>
              </div>
              {category.features.map((feature, featIndex) => (
                <div key={featIndex} className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200 hover:bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    {feature.name}
                  </div>
                  <div className="text-center text-sm text-gray-700">
                    {typeof feature.starter === 'boolean' ? (
                      feature.starter ? <Check className="w-5 h-5 text-gray-900 mx-auto" /> : '—'
                    ) : (
                      feature.starter
                    )}
                  </div>
                  <div className="text-center text-sm text-gray-700">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? <Check className="w-5 h-5 text-gray-900 mx-auto" /> : '—'
                    ) : (
                      feature.pro
                    )}
                  </div>
                  <div className="text-center text-sm text-gray-700">
                    {typeof feature.enterprise === 'boolean' ? (
                      feature.enterprise ? <Check className="w-5 h-5 text-gray-900 mx-auto" /> : '—'
                    ) : (
                      feature.enterprise
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Table Footer */}
          <div className="p-6 bg-blue-50 text-center">
            <a href="#" className="text-blue-600 font-medium hover:underline">Contact billing →</a>
            <span className="mx-3 text-gray-400">|</span>
            <span className="text-sm text-gray-600">48 hours support response time</span>
            <span className="mx-3 text-gray-400">|</span>
            <span className="text-sm text-gray-600">24 hours support response time</span>
            <span className="mx-3 text-gray-400">|</span>
            <span className="text-sm text-gray-600">Immediate support</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
        <p className="text-gray-600 mb-8">
          After reading this section, if you still have questions, feel free to contact us, however you want.
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${
                  openFaq === index ? 'rotate-180' : ''
                }`} />
              </button>
              {openFaq === index && (
                <div className="px-6 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-4">ROSTER86</div>
              <p className="text-sm text-blue-600 mb-2">Effortless scheduling</p>
              <p className="text-sm text-gray-600">For all your needs</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <a href="/#features" className="block text-gray-600 hover:text-gray-900">Features</a>
                <a href="#" className="block text-gray-600 hover:text-gray-900">Integrations</a>
                <a href="#" className="block text-gray-600 hover:text-gray-900">Download</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-gray-600 hover:text-gray-900">About</a>
                <a href="#" className="block text-gray-600 hover:text-gray-900">Blog</a>
                <a href="#" className="block text-gray-600 hover:text-gray-900">Customers</a>
                <a href="#" className="block text-gray-600 hover:text-gray-900">Careers</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Other</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-gray-600 hover:text-gray-900">Contact</a>
                <a href="/pricing-public" className="block text-gray-600 hover:text-gray-900">Pricing</a>
                <a href="/login" className="block text-gray-600 hover:text-gray-900">Login</a>
                <a href="/register" className="block text-gray-600 hover:text-gray-900">Sign up</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <div>© 2025 Roster86. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900">Privacy policy</a>
              <a href="#" className="hover:text-gray-900">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
