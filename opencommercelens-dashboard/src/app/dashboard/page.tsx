'use client';
import { useEffect, useState } from 'react';
import { api, Stats, Usage, Integration } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import CoreLayout from '@/components/CoreLayout';

const tools = [
  { icon: '🔍', label: 'Find Leads', bg: 'bg-blue-50', action: 'find_leads' },
  { icon: '📧', label: 'Send Email', bg: 'bg-purple-50', action: 'send_email' },
  { icon: '📊', label: 'Analytics', bg: 'bg-green-50', action: 'analytics' },
  { icon: '🤖', label: 'AI Agent', bg: 'bg-orange-50', action: 'agent' },
  { icon: '📝', label: 'Templates', bg: 'bg-pink-50', action: 'templates' },
  { icon: '🔗', label: 'Integrations', bg: 'bg-indigo-50', action: 'integrations' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const { user, tenant } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usageRes, intRes] = await Promise.all([
          api.getStats(),
          api.getUsage(),
          api.getIntegrations()
        ]);
        setStats(statsRes.stats);
        setUsage(usageRes);
        setIntegrations(intRes.integrations);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToolAction = async (action: string) => {
    if (action === 'find_leads') {
      const query = prompt('What type of stores do you want to find? (e.g., "beauty products", "coffee shops", "fitness apparel")');
      if (!query) return;
      setActionLoading(action);
      try {
        const result = await api.findLeads(query, 10);
        setMessage({ type: 'success', text: result.message });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setActionLoading(null);
      }
    } else if (action === 'analytics') {
      setActionLoading(action);
      try {
        const res = await api.getAnalytics();
        setAnalytics(res.analytics);
        setShowAnalytics(true);
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setActionLoading(null);
      }
    } else if (action === 'integrations') {
      setMessage({ type: 'success', text: 'Integrations connected: ' + integrations.filter(i => i.connected).map(i => i.name).join(', ') });
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <CoreLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* Central Hero & Search Area */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {greeting()}, {user?.name || 'there'} 👋
          </h1>
          <p className="text-gray-500 mb-6">What would you like to do today?</p>
          
          {/* Command Bar */}
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, campaigns, or type a command... (Ctrl+K)"
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Ctrl+K
            </span>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-24 right-6 p-4 rounded-xl shadow-lg z-50 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <p className="font-medium">{message.text}</p>
            <button onClick={() => setMessage(null)} className="absolute top-2 right-2 text-gray-400">✕</button>
          </div>
        )}

        {/* Quick-Access Tool Grid */}
        <div className="mb-10">
          <div className="flex gap-3 justify-center flex-wrap">
            {tools.map((tool) => (
              <button
                key={tool.action}
                onClick={() => handleToolAction(tool.action)}
                disabled={actionLoading === tool.action}
                className={`${tool.bg} px-5 py-3 rounded-2xl flex items-center gap-2 hover:shadow-md transition-all disabled:opacity-50`}
              >
                {actionLoading === tool.action ? (
                  <span className="text-xl animate-spin">⏳</span>
                ) : (
                  <span className="text-xl">{tool.icon}</span>
                )}
                <span className="font-medium text-gray-700">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Integration Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-medium text-gray-800">Connected Integrations</p>
                <div className="flex gap-2 mt-1">
                  {integrations.filter(i => i.connected).map(integration => (
                    <span key={integration.id} className="text-xs bg-white px-2 py-1 rounded-full">
                      {integration.icon} {integration.name}
                    </span>
                  ))}
                  {integrations.filter(i => !i.connected).length > 0 && (
                    <span className="text-xs text-gray-500">
                      +{integrations.filter(i => !i.connected).length} more available
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Manage →
            </button>
          </div>
        </div>

        {/* Dashboard Split View */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Stats */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-6">Overview</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Total Leads" value={stats?.leads || 0} icon="👥" color="blue" />
                <StatCard label="Interested" value={stats?.interested || 0} icon="❤️" color="green" />
                <StatCard label="Campaigns" value={stats?.campaigns || 0} icon="📧" color="purple" />
                <StatCard label="Emails Sent" value={stats?.emails || 0} icon="✉️" color="orange" />
              </div>
            )}
            
            {/* Usage Bars */}
            <div className="mt-8 space-y-4">
              <h3 className="font-medium text-gray-700">Plan Usage</h3>
              <UsageBar label="Leads" used={usage?.usage.leads || 0} total={usage?.limits.leads || 10} />
              <UsageBar label="Campaigns" used={usage?.usage.campaigns || 0} total={usage?.limits.campaigns || 1} />
              <UsageBar label="Emails/mo" used={usage?.usage.emails_this_month || 0} total={usage?.limits.emails_per_month || 50} />
            </div>
          </div>

          {/* Right Panel - Create CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => handleToolAction('find_leads')}
                disabled={actionLoading === 'find_leads'}
                className="w-full bg-white/20 hover:bg-white/30 py-3 px-4 rounded-xl text-left font-medium transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <span>🔍</span> Find New Leads
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 py-3 px-4 rounded-xl text-left font-medium transition-colors flex items-center gap-3">
                <span>📧</span> Start Campaign
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 py-3 px-4 rounded-xl text-left font-medium transition-colors flex items-center gap-3">
                <span>📊</span> View Reports
              </button>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/20">
              <p className="text-sm text-white/70 mb-2">Current Plan</p>
              <p className="text-2xl font-bold capitalize">{usage?.plan || 'Free'}</p>
              {usage && (
                <p className="text-sm text-white/70 mt-1">
                  {usage.remaining.leads} leads remaining
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-lg mb-4">Lead Pipeline</h2>
          <div className="flex gap-3">
            <PipelineStage label="New" count={stats?.leads || 0} color="bg-blue-100 text-blue-700" />
            <PipelineStage label="Contacted" count={0} color="bg-yellow-100 text-yellow-700" />
            <PipelineStage label="Interested" count={stats?.interested || 0} color="bg-green-100 text-green-700" />
            <PipelineStage label="Unsubscribed" count={stats?.unsubscribed || 0} color="bg-gray-100 text-gray-700" />
          </div>
        </div>

        {/* Analytics Modal */}
        {showAnalytics && analytics && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAnalytics(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Analytics</h2>
                <button onClick={() => setShowAnalytics(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{analytics.conversionRate || 0}%</p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{Object.values(analytics.leadsByStatus || {}).reduce((a: number, b: any) => a + b, 0)}</p>
                  <p className="text-sm text-gray-600">Total Leads</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{analytics.leadsBySource?.length || 0}</p>
                  <p className="text-sm text-gray-600">Sources</p>
                </div>
              </div>

              <h3 className="font-medium mb-3">Leads by Status</h3>
              <div className="space-y-2 mb-6">
                {Object.entries(analytics.leadsByStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="capitalize">{status}</span>
                    <span className="font-bold">{count as number}</span>
                  </div>
                ))}
                {Object.keys(analytics.leadsByStatus || {}).length === 0 && (
                  <p className="text-gray-400 text-sm">No data yet</p>
                )}
              </div>

              <h3 className="font-medium mb-3">Discovery Sources</h3>
              <div className="space-y-2">
                {analytics.leadsBySource?.map((source: any) => (
                  <div key={source.source} className="flex justify-between items-center">
                    <span>{source.source}</span>
                    <span className="font-bold">{source.count}</span>
                  </div>
                ))}
                {(!analytics.leadsBySource || analytics.leadsBySource.length === 0) && (
                  <p className="text-gray-400 text-sm">No data yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CoreLayout>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, used, total }: { label: string; used: number; total: number }) {
  const percent = Math.min((used / total) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{used} / {total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${percent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PipelineStage({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex-1 ${color} rounded-xl p-4 text-center`}>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}
