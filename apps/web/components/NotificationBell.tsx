"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { formatRelativeTime } from "../lib/format";
import type { Notification, NotificationList } from "../lib/types";
import { BellIcon } from "./icons";

const POLL_INTERVAL_MS = 30_000;

// Dropdown preview of the 8 most recent notifications, plus a live unread badge. The full,
// paginated, filterable list lives at /notifications — this is just the always-visible
// entry point into what NotificationListenerService has been writing (CLAUDE.md SS26/SS31).
export function NotificationBell() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    (showLoading = false) => {
      if (!token) return;
      if (showLoading) setLoading(true);
      api
        .get<NotificationList>("/notifications/mine?take=8", token)
        .then((res) => {
          setItems(res.items);
          setUnreadCount(res.unreadCount);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [token],
  );

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, load]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.post("/notifications/mark-all-read", undefined, token);
    } catch {
      load();
    }
  }

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load(true);
        }}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-tm-navy transition hover:bg-tm-navy/5"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-tm-gold px-1 text-[10px] font-bold text-tm-dark">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // Below `lg` the Sidebar collapses and this bell sits near the Topbar's left edge
        // (next to the hamburger button) — an `absolute right-0` dropdown there would
        // anchor its right edge to that narrow local wrapper and push most of its 320px
        // width off the left of the screen. Fixed-position, inset-margined panel below
        // `lg`; the compact bell-anchored dropdown once the Sidebar (and the space it
        // frees up on the right) is actually there — same breakpoint Sidebar.tsx itself
        // switches on.
        <div className="fixed inset-x-4 top-16 z-50 rounded-lg border border-tm-navy/10 bg-tm-white shadow-lg lg:absolute lg:inset-x-auto lg:right-0 lg:top-11 lg:w-80">
          <div className="flex items-center justify-between border-b border-tm-navy/10 px-4 py-3">
            <p className="text-sm font-bold text-tm-navy">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-tm-navy hover:text-tm-gold">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-tm-dark/50">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-tm-dark/50">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n)}
                  className={`block w-full border-b border-tm-navy/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-tm-navy/[0.03] ${
                    n.isRead ? "" : "bg-tm-gold/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tm-gold" />}
                    <div className={n.isRead ? "pl-3.5" : ""}>
                      <p className="text-sm font-semibold text-tm-dark">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-tm-dark/60">{n.body}</p>
                      <p className="mt-1 text-[11px] text-tm-dark/40">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-tm-navy/10 px-4 py-2.5 text-center text-xs font-semibold text-tm-navy hover:text-tm-gold"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
