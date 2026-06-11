'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminActivityLogs } from '@/lib/firestore';
import type { AdminActivityAction, AdminActivityEntity, AdminActivityLog } from '@/types';
import { EmptyState, Spinner } from '@/components/ui';
import { History, RefreshCcw } from 'lucide-react';
import Button from '@/components/ui/Button';

const ACTION_LABELS: Record<AdminActivityAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  status_change: 'Status Change',
  stock_add: 'Stock Added',
  import: 'Imported',
  manual_sale: 'Manual Sale',
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getActorLabel(log: AdminActivityLog): string {
  return log.actorName || log.actorEmail || log.actorId || 'Unknown admin';
}

function renderMetadataValue(value: string | number | boolean | null): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | AdminActivityEntity>('all');
  const [actionFilter, setActionFilter] = useState<'all' | AdminActivityAction>('all');

  const load = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getAdminActivityLogs(150);
      setLogs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !term ||
        log.message.toLowerCase().includes(term) ||
        log.entityLabel.toLowerCase().includes(term) ||
        getActorLabel(log).toLowerCase().includes(term);

      const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;

      return matchesSearch && matchesEntity && matchesAction;
    });
  }, [actionFilter, entityFilter, logs, search]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Admin Logs</h1>
          <p className="mt-1 text-stone-500">
            See who made changes in the admin panel and what was updated.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load(true)}
          loading={refreshing}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by admin, item, or message"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:max-w-md"
        />

        <select
          value={entityFilter}
          onChange={(event) => setEntityFilter(event.target.value as 'all' | AdminActivityEntity)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:w-56"
        >
          <option value="all">All Sections</option>
          {entityOptions.map((entity) => (
            <option key={entity} value={entity}>
              {entity.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as 'all' | AdminActivityAction)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:w-56"
        >
          <option value="all">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History className="h-16 w-16" />}
          title={logs.length === 0 ? 'No admin activity yet' : 'No logs match your filters'}
          description={
            logs.length === 0
              ? 'Audit entries will appear here after admins create, update, or delete records.'
              : 'Try a different search term or filter combination.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">When</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Admin</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Section</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Item</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Update</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="align-top transition hover:bg-stone-50">
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{getActorLabel(log)}</p>
                        {(log.actorEmail || log.actorId) && (
                          <p className="text-xs text-stone-500">{log.actorEmail || log.actorId}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        {ACTION_LABELS[log.action]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm capitalize text-stone-600">{log.entity.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{log.entityLabel || '-'}</p>
                        <p className="text-xs text-stone-500">{log.entityId}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-700">{log.message}</td>
                    <td className="px-5 py-4">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <div className="space-y-1 text-xs text-stone-500">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-semibold text-stone-700">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              {renderMetadataValue(value)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-stone-400">-</span>
                      )}
                    </td>
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
