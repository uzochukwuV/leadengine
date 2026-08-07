'use client';
import { useEffect, useState } from 'react';
import { api, Campaign, Template } from '@/lib/api';
import CoreLayout from '@/components/CoreLayout';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsRes, templatesRes] = await Promise.all([
          api.getCampaigns(),
          api.getTemplates()
        ]);
        setCampaigns(campaignsRes.campaigns);
        setTemplates(templatesRes.templates);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setCreating(true);
    try {
      const result = await api.createCampaign(newCampaignName);
      setCampaigns([{ 
        id: result.campaign_id, 
        name: newCampaignName, 
        status: 'active', 
        created_at: new Date().toISOString() 
      }, ...campaigns]);
      setNewCampaignName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    setDeleting(id);
    try {
      await api.deleteCampaign(id);
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete campaign');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <CoreLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-500 mt-1">Manage your outreach campaigns</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 flex items-center gap-2"
          >
            <span>➕</span> New Campaign
          </button>
        </div>

        {/* Campaign Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-4">📧</div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Create your first outreach campaign to start connecting with leads.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">{campaign.name}</h3>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Created {new Date(campaign.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100">
                    View
                  </button>
                  <button 
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    disabled={deleting === campaign.id}
                    className="flex-1 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleting === campaign.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Templates Section - Now with REAL data */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Email Templates</h2>
          <div className="grid grid-cols-4 gap-4">
            {templates.map(template => (
              <div key={template.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm cursor-pointer group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-3 text-lg group-hover:scale-110 transition-transform">
                  📝
                </div>
                <p className="font-medium text-gray-700">{template.name}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{template.category.replace('_', ' ')}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 truncate">{template.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g., Summer Fitness Outreach"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={creating || !newCampaignName.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoreLayout>
  );
}
