import React from 'react';
import { Sparkles, ShieldCheck, LogOut, Plus, Menu, User, BookOpen, LayoutDashboard, MessageSquareText } from 'lucide-react';
import type { UserProfile, NotificationSettings, NotificationLog } from '../types';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  user: UserProfile | null;
  currentView: 'dashboard' | 'workspace';
  onChangeView: (view: 'dashboard' | 'workspace') => void;
  onSignOut: () => void;
  onNewSession: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  notificationSettings?: NotificationSettings | null;
  notificationLogs?: NotificationLog[];
  onOpenNotificationSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  onChangeView,
  onSignOut,
  onNewSession,
  onToggleSidebar,
  isSidebarOpen,
  notificationSettings = null,
  notificationLogs = [],
  onOpenNotificationSettings,
}) => {
  return (
    <header id="app-navbar" className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {user && onToggleSidebar && (
            <button
              id="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
              aria-label={isSidebarOpen ? "Close history" : "Open history"}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onChangeView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base text-slate-100 tracking-tight flex items-center gap-1.5">
                📔 My Life Journal
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  ReflectAI
                </span>
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Multi-Sector Journal & Gemini Companion
              </span>
            </div>
          </div>
        </div>

        {/* Center: View Switcher Tabs (Dashboard vs Workspace) */}
        {user && (
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              id="nav-tab-dashboard"
              onClick={() => onChangeView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Life Journal</span>
            </button>
            <button
              id="nav-tab-workspace"
              onClick={() => onChangeView('workspace')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Reflect Chat</span>
            </button>
          </div>
        )}

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Notification Bell */}
              {onOpenNotificationSettings && (
                <NotificationBell
                  settings={notificationSettings}
                  logs={notificationLogs}
                  onOpenSettings={onOpenNotificationSettings}
                />
              )}

              <button
                id="navbar-new-reflection-btn"
                onClick={onNewSession}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-600/30 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Entry</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User avatar"}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-medium text-xs border border-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left max-w-[130px]">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {user.displayName || "Explorer"}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {user.email || (user.isAnonymous ? "Guest Session" : "Authenticated")}
                  </span>
                </div>

                <button
                  id="signout-button"
                  onClick={onSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                  title="Sign out of ReflectAI"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Ready to reflect?</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

