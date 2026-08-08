/**
 * Billing Routes - Stripe Integration
 */
import { Router } from 'express';
import { getDatabase } from '../db';

const router = Router();
const db = getDatabase();

const PLANS: Record<string, { name: string; price: number; limits: { leads: number; campaigns: number; emails_per_month: number } }> = {
  free: { name: 'Free', price: 0, limits: { leads: 10, campaigns: 1, emails_per_month: 50 } },
  starter: { name: 'Starter', price: 29, limits: { leads: 100, campaigns: 5, emails_per_month: 500 } },
  pro: { name: 'Pro', price: 99, limits: { leads: 1000, campaigns: 20, emails_per_month: 5000 } },
  enterprise: { name: 'Enterprise', price: 299, limits: { leads: 999999, campaigns: 999999, emails_per_month: 999999 } }
};

router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

router.get('/usage', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string || (req.query.tenant_id as string);
  if (!tenantId) return res.status(401).json({ error: 'Tenant ID required' });
  
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  
  const plan = PLANS[tenant.plan] || PLANS.free;
  const leads = db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId).c;
  const campaigns = db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?').get(tenantId).c;
  const emails = db.prepare("SELECT COUNT(*) as c FROM emails WHERE tenant_id = ? AND direction = 'outbound'").get(tenantId).c;
  
  res.json({
    plan: tenant.plan,
    planName: plan.name,
    limits: plan.limits,
    usage: { leads, campaigns, emails_this_month: emails },
    remaining: {
      leads: Math.max(0, plan.limits.leads - leads),
      campaigns: Math.max(0, plan.limits.campaigns - campaigns),
      emails: Math.max(0, plan.limits.emails_per_month - emails)
    }
  });
});

router.post('/checkout', (req, res) => {
  const { plan, tenant_id } = req.body;
  if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
  
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id) as any;
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ success: true, message: 'Stripe not configured - would redirect to checkout', checkout_url: null });
  }
  
  res.json({ success: true, checkout_url: `https://checkout.stripe.com/test?plan=${plan}&tenant=${tenant_id}` });
});

router.post('/webhooks/stripe', (req, res) => {
  try {
    const event = req.body;
    console.log('Stripe webhook:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        const newPlan = session.metadata?.plan;
        if (tenantId && newPlan && PLANS[newPlan]) {
          db.prepare('UPDATE tenants SET plan = ?, limits = ?, stripe_customer_id = ? WHERE id = ?').run(newPlan, JSON.stringify(PLANS[newPlan].limits), session.customer, tenantId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenant_id;
        const newPlan = sub.metadata?.plan;
        if (tenantId && newPlan && PLANS[newPlan]) {
          db.prepare('UPDATE tenants SET plan = ?, limits = ? WHERE id = ?').run(newPlan, JSON.stringify(PLANS[newPlan].limits), tenantId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenant_id;
        if (tenantId) {
          db.prepare('UPDATE tenants SET plan = ?, limits = ? WHERE id = ?').run('free', JSON.stringify(PLANS.free.limits), tenantId);
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;
