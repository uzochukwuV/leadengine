'use client';
import { useEffect, useState } from 'react';
import { api, Lead } from '@/lib/api';
import CoreLayout from '@/components/CoreLayout';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchLeads = () => {
    api.getLeads().then(res => {
      setLeads(res.leads);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    setDeleting(id);
    try {
      await api.deleteLead(id);
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      alert('Failed to delete lead');
    } finally {
      setDeleting(null);
    }
  };

  const handleSendEmail = async (lead: Lead) => {
    try {
      const result = await api.sendEmail(lead.id);
      alert(result.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(l => l.status === filter);

  return (
    <CoreLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1">{leads.length} total leads in your pipeline</p>
          </div>
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 flex items-center gap-2">
            <span>🔍</span> Find Leads
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'new', 'qualified', 'contacted', 'interested'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === status 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No leads found</h3>
            <p className="text-gray-500">Start by finding some Shopify stores to reach out to.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredLeads.map(lead => (
              <div key={lead.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                    {(lead.email || 'L')[0].toUpperCase()}
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                    lead.status === 'interested' ? 'bg-green-100 text-green-700' :
                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                    lead.status === 'qualified' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                <h3 className="font-medium text-gray-800 mb-1">{lead.email}</h3>
                <p className="text-sm text-gray-500 mb-3">{lead.store_name || 'No store'}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSendEmail(lead)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100"
                  >
                    Email
                  </button>
                  <button 
                    onClick={() => handleDelete(lead.id)}
                    disabled={deleting === lead.id}
                    className="flex-1 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleting === lead.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CoreLayout>
  );
}
