"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { RequireAuth } from "../../components/RequireAuth";
import { Topbar } from "../../components/Topbar";
import { formatRelativeTime } from "../../lib/format";
import type { Notification, NotificationList } from "../../lib/types";

const PAGE_SIZE = 20;

function NotificationsList() {
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) });
    if (unreadOnly) params.set("unreadOnly", "true");

    api
      .get<NotificationList>(`/notifications/mine?${params.toString()}`, token)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setUnreadCount(res.unreadCount);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load notifications."))
      .finally(() => setLoading(false));
  }, [token, skip, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(notification: Notification) {
    if (notification.isRead || !token) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${notification.id}/read`, undefined, token);
    } catch {
      load();
    }
  }

  async function markAllRead() {
    if (!token || unreadCount === 0) return;
    try {
      await api.post("/notifications/mark-all-read", undefined, token);
      load();
    } catch {
      // leave state as-is; the next load() will reconcile
    }
  }

  return (
    <>
      <Topbar title="Notifications" subtitle="Everything TrustMart has told you about your activity" />
      <main className="flex-1 space-y-6 bg-tm-navy/[0.02] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSkip(0);
                setUnreadOnly(false);
              }}
              className={`tm-badge ${!unreadOnly ? "bg-tm-navy text-tm-white" : "bg-tm-navy/10 text-tm-navy"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setSkip(0);
                setUnreadOnly(true);
              }}
              className={`tm-badge ${unreadOnly ? "bg-tm-navy text-tm-white" : "bg-tm-navy/10 text-tm-navy"}`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="text-sm font-medium text-tm-navy hover:text-tm-gold">
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-tm-dark/60">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <div className="tm-card">
            <p className="text-sm text-tm-dark/60">
              {unreadOnly ? "No unread notifications." : "Nothing here yet — activity on your listings, leads, and Escrows will show up here."}
            </p>
          </div>
        ) : (
          <div className="tm-card divide-y divide-tm-navy/5 p-0">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-tm-navy/[0.03] ${
                  n.isRead ? "" : "bg-tm-gold/5"
                }`}
              >
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tm-gold" />}
                <div className={n.isRead ? "pl-5" : ""}>
                  <p className="text-sm font-semibold text-tm-dark">{n.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-tm-dark/70">{n.body}</p>
                  <p className="mt-1.5 text-xs text-tm-dark/40">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </button>
            ))}
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

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsList />
    </RequireAuth>
  );
}
