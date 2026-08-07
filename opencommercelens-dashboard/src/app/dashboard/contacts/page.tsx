'use client';
import { useEffect, useState } from 'react';
import { api, Contact } from '@/lib/api';
import CoreLayout from '@/components/CoreLayout';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContacts().then(res => {
      setContacts(res.contacts);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <CoreLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-500 mt-1">{contacts.length} contacts from all channels</p>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📇</div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">No contacts yet</h3>
              <p className="text-gray-500">Contacts are added automatically when people reply to your emails.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {(contact.name || contact.email || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{contact.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium bg-gray-100 rounded-full capitalize">
                        {contact.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                        contact.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </CoreLayout>
  );
}
