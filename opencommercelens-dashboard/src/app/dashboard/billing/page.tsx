'use client';
import { useEffect, useState } from 'react';
import { api, Plan, Usage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import CoreLayout from '@/components/CoreLayout';

export default function BillingPage() {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const { tenant } = useAuth();

  useEffect(() => {
    Promise.all([api.getPlans(), api.getUsage()])
      .then(([plansRes, usageRes]) => {
        setPlans(plansRes.plans);
        setUsage(usageRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: string) => {
    if (!tenant) return;
    try {
      const res = await api.checkout(plan, tenant.id);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        alert('Stripe not configured. Add STRIPE_SECRET_KEY to backend .env');
      }
    } catch (err) {
      alert('Failed to start checkout');
    }
  };

  return (
    <CoreLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Plans & Billing</h1>
          <p className="text-gray-500 mt-1">Choose the plan that fits your needs</p>
        </div>

        {/* Current Usage */}
        {!loading && usage && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Plan</p>
                <p className="text-3xl font-bold capitalize">{usage.planName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">This month</p>
                <p className="text-lg font-medium">
                  {usage.usage.emails_this_month} / {usage.limits.emails_per_month} emails
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrentPlan = tenant?.plan === key;
            const isPopular = key === 'pro';
            
            return (
              <div 
                key={key}
                className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                  isCurrentPlan ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'
                } ${isPopular ? 'ring-2 ring-purple-100' : ''}`}
              >
                {isPopular && (
                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-full mb-3">
                    Most Popular
                  </span>
                )}
                
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-gray-500">/month</span>}
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {plan.limits.leads === 999999 ? 'Unlimited' : plan.limits.leads} leads
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {plan.limits.campaigns === 999999 ? 'Unlimited' : plan.limits.campaigns} campaigns
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {plan.limits.emails_per_month === 999999 ? 'Unlimited' : plan.limits.emails_per_month} emails/month
                  </li>
                </ul>
                
                {isCurrentPlan ? (
                  <button disabled className="w-full py-3 bg-gray-100 text-gray-400 font-medium rounded-xl cursor-not-allowed">
                    Current Plan
                  </button>
                ) : plan.price === 0 ? (
                  <button disabled className="w-full py-3 bg-gray-50 text-gray-500 font-medium rounded-xl cursor-not-allowed">
                    Free Tier
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade(key)}
                    className={`w-full py-3 font-medium rounded-xl transition-colors ${
                      isPopular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {tenant && ['starter', 'pro', 'enterprise'].includes(tenant.plan) ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { q: 'Can I change plans anytime?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
              { q: 'What happens if I exceed my limits?', a: 'You can continue using the platform, but we recommend upgrading to avoid service interruptions.' },
              { q: 'Do you offer refunds?', a: 'We offer a 14-day money-back guarantee for all paid plans.' },
              { q: 'What payment methods do you accept?', a: 'We accept all major credit cards through our secure Stripe integration.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CoreLayout>
  );
}
