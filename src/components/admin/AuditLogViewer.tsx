import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { Activity, Search, Clock, User, Filter, ShieldAlert } from 'lucide-react';

interface AuditLogViewerProps {
  audits: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ audits }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      const term = search.toLowerCase();
      const matchesSearch =
        a.action.toLowerCase().includes(term) ||
        a.performedBy.toLowerCase().includes(term) ||
        (a.details && a.details.toLowerCase().includes(term));

      const matchesAction = actionFilter === 'ALL' || a.action.includes(actionFilter);

      return matchesSearch && matchesAction;
    });
  }, [audits, search, actionFilter]);

  const uniqueActions = useMemo(() => {
    const set = new Set(audits.map((a) => a.action.split('_')[0]));
    return Array.from(set);
  }, [audits]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Audit & Compliance Log</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable trace of administrative changes, lead mutations, role alterations, and team reassignments.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by action, actor, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Categories</option>
              {uniqueActions.map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix} Actions
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredAudits.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-400">No matching audit events recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Details / Target Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAudits.map((a) => {
                  const isDelete = a.action.includes('DELETE') || a.action.includes('DEACTIVAT');
                  const isCreate = a.action.includes('CREATE');

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(a.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                            isDelete
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isCreate
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <User className="w-3 h-3 text-slate-400" />
                          {a.performedBy}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {a.details}
                        {a.targetId && (
                          <span className="ml-2 font-mono text-[10px] text-slate-500">
                            [{a.targetId}]
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
