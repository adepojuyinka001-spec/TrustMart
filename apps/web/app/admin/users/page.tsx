"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { AdminUser, Role } from "../../../lib/types";
import { useAuth } from "../../../lib/auth-context";
import { RequirePermission } from "../../../components/RequirePermission";
import { Topbar } from "../../../components/Topbar";
import { StatusBadge } from "../../../components/StatusBadge";

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ["", "ACTIVE", "SUSPENDED", "DEACTIVATED"];

function RoleAssigner({ roles, existingKeys, onAssign }: { roles: Role[]; existingKeys: string[]; onAssign: (roleKey: string) => void }) {
  const [value, setValue] = useState("");
  const assignable = roles.filter((r) => !existingKeys.includes(r.key));

  if (assignable.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="tm-select h-8 py-1 text-xs">
        <option value="">+ Add role…</option>
        {assignable.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!value}
        onClick={() => {
          onAssign(value);
          setValue("");
        }}
        className="tm-btn-outline h-8 px-2.5 py-1 text-xs disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

function AdminUsers() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);

    api
      .get<{ items: AdminUser[]; total: number }>(`/admin/users?${params.toString()}`, token)
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."))
      .finally(() => setLoading(false));
  }, [token, search, status, skip]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    api.get<Role[]>("/admin/roles", token).then(setRoles).catch(() => {});
  }, [token]);

  async function setUserStatus(userId: string, newStatus: string) {
    if (!token) return;
    setBusyUserId(userId);
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus }, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function assignRole(userId: string, roleKey: string) {
    if (!token) return;
    setBusyUserId(userId);
    try {
      await api.post(`/admin/users/${userId}/roles`, { roleKey }, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function revokeRole(userId: string, roleKey: string) {
    if (!token) return;
    setBusyUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}/roles/${roleKey}`, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <>
      <Topbar title="Admin — Users" subtitle="Accounts, status, and role assignments" />
      <main className="flex-1 space-y-4 bg-tm-navy/[0.02] p-6">
        <div className="tm-card flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-tm-dark/60">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSkip(0);
                setSearch(e.target.value);
              }}
              placeholder="Email or name…"
              className="tm-input"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-tm-dark/60">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setSkip(0);
                setStatus(e.target.value);
              }}
              className="tm-select"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-tm-dark/60">No users match this filter.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isBusy = busyUserId === u.id;
              const roleKeys = u.userRoles.map((ur) => ur.role.key);
              return (
                <div key={u.id} className="tm-card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-tm-dark">
                        {u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email}
                        {isSelf && <span className="ml-2 text-xs font-normal text-tm-dark/40">(you)</span>}
                      </p>
                      <p className="text-xs text-tm-dark/50">
                        {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={u.status} />
                      {!isSelf && (
                        <select
                          value=""
                          disabled={isBusy}
                          onChange={(e) => e.target.value && setUserStatus(u.id, e.target.value)}
                          className="tm-select h-8 py-1 text-xs disabled:opacity-40"
                        >
                          <option value="">Change status…</option>
                          {STATUS_OPTIONS.filter((s) => s && s !== u.status).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {roleKeys.length === 0 ? (
                      <span className="text-xs text-tm-dark/40">No roles assigned</span>
                    ) : (
                      u.userRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="tm-badge flex items-center gap-1.5 bg-tm-navy/10 text-tm-navy"
                        >
                          {ur.role.label}
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => revokeRole(u.id, ur.role.key)}
                              aria-label={`Remove ${ur.role.label} role`}
                              className="-m-1.5 p-1.5 text-tm-navy/50 hover:text-red-600 disabled:opacity-40"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                    {!isSelf && (
                      <RoleAssigner roles={roles} existingKeys={roleKeys} onAssign={(roleKey) => assignRole(u.id, roleKey)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="tm-btn-outline disabled:opacity-40"
            >
              Newer
            </button>
            <p className="text-tm-dark/60">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
            </p>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="tm-btn-outline disabled:opacity-40"
            >
              Older
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="user:manage">
      <AdminUsers />
    </RequirePermission>
  );
}
