import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { NotificationSettings, NotificationLog } from '../types';

interface NotificationBellProps {
  settings: NotificationSettings | null;
  logs: NotificationLog[];
  onOpenSettings: () => void;
  onSendDigestQuick?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  settings,
  logs,
  onOpenSettings,
  onSendDigestQuick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasConfiguredChannels =
    Boolean(settings?.emailEnabled && settings.recipientEmail) ||
    Boolean(settings?.slackEnabled && settings.slackWebhookUrl);

  const recentLogs = logs.slice(0, 4);
  const unreadCount = logs.filter((l) => {
    const diffHours = (Date.now() - new Date(l.timestamp).getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  }).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
        title="Notifications & Integrations"
        aria-label="Notification Center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-slate-950 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-bell-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-xs"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white text-sm">Notifications</span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Configure
            </button>
          </div>

          {/* Active Channels Status Bar */}
          <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Email:</span>
                <span
                  className={`font-semibold ${
                    settings?.emailEnabled ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {settings?.emailEnabled ? 'Active' : 'Off'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slack:</span>
                <span
                  className={`font-semibold ${
                    settings?.slackEnabled ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {settings?.slackEnabled ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Dispatches Feed */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
            {recentLogs.length === 0 ? (
              <div className="py-6 px-4 text-center text-slate-500">
                <p className="font-medium text-slate-400 text-xs">No recent notifications</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Configure Email or Slack webhooks to receive automated executive reports.
                </p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/60 transition-colors flex items-start gap-2.5"
                >
                  <div
                    className={`mt-0.5 p-1 rounded-md ${
                      log.channel === 'email'
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {log.channel === 'email' ? (
                      <Mail className="w-3 h-3" />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200 truncate">{log.title}</div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{log.summary}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Notification Channels
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
