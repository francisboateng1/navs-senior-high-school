import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { LoadingSkeleton } from '../components/ui/Common.jsx';

export default function AdminUsersPage() {
  useDocumentTitle('Staff Accounts & Audit Logs', 'Manage administrator roles, permissions, security audit logs, and email notifications.');
  const { showToast } = useToast();

  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');

  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    email: '',
    password: '',
    roleSlug: 'admissions_officer',
  });

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [uRes, aRes, nRes] = await Promise.all([
        apiRequest('/api/admin/users'),
        apiRequest('/api/admin/users/audit-logs'),
        apiRequest('/api/admin/users/notifications'),
      ]);
      setAdmins(uRes.administrators);
      setRoles(uRes.roles);
      setAuditLogs(aRes.logs);
      setNotifications(nRes.notifications);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load user management data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newAdmin),
      });
      setNewAdmin({ fullName: '', email: '', password: '', roleSlug: 'admissions_officer' });
      showToast('Administrator account created.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create administrator.', 'error');
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      await apiRequest(`/api/admin/users/${admin.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !admin.is_active }),
      });
      showToast('Administrator status updated.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0C1E3C]">Staff Roles, Audit Trail &amp; Notifications</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage administrator accounts, role-based access control, security audit logs, and email dispatch logs.
        </p>
      </div>

      <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg">
        {[
          { key: 'users', label: 'Administrators & Roles' },
          { key: 'audit', label: 'Security Audit Logs' },
          { key: 'notifications', label: 'Email Notifications Log' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === t.key ? 'bg-[#0C1E3C] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : tab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleCreateAdmin} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4 h-fit">
            <h2 className="text-lg font-semibold text-[#0C1E3C]">Add Staff Administrator</h2>
            <input required placeholder="Full Name" value={newAdmin.fullName} onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
            <input required type="email" placeholder="Official Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
            <input required type="password" minLength={8} placeholder="Temporary Password (min 8 chars)" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
            <div>
              <label htmlFor="new-admin-role" className="block text-xs font-semibold text-slate-600 mb-1">
                Assigned Role
              </label>
              <select
                id="new-admin-role"
                value={newAdmin.roleSlug}
                onChange={(e) => setNewAdmin({ ...newAdmin, roleSlug: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 bg-[#0C1E3C] text-white text-sm font-semibold rounded-md hover:bg-[#162B4D]">
              Create Administrator Account
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {admins.map((a) => (
              <div key={a.id} className="p-5 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#0C1E3C]">{a.full_name}</p>
                  <p className="text-xs text-slate-600">{a.email}</p>
                  <p className="text-xs font-medium text-[#8D6419] mt-1">
                    {a.roles.map((r) => r.name).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(a)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    a.is_active ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-slate-300 text-slate-500'
                  }`}
                >
                  {a.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'audit' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 tabular-nums text-slate-500 whitespace-nowrap">{l.created_at}</td>
                    <td className="px-4 py-2.5 text-slate-800">{l.actor_email || 'Public'}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-[#0C1E3C]">{l.action}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="px-4 py-2.5 tabular-nums text-slate-500 whitespace-nowrap">{n.created_at}</td>
                    <td className="px-4 py-2.5 text-slate-800">{n.recipient_email}</td>
                    <td className="px-4 py-2.5 text-slate-800">{n.subject}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#8D6419]">{n.delivery_status}</td>
                    <td className="px-4 py-2.5 text-slate-600">{n.error_message || 'Delivered'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
