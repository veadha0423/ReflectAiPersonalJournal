import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signInAsGuest,
  logOut,
  mapFirebaseUser,
  subscribeToUserInteractions,
  saveUserInteraction,
  deleteUserInteraction,
  subscribeToCustomCategories,
  saveCustomCategory,
  deleteCustomCategory,
  subscribeToNotificationSettings,
  saveNotificationSettings,
  subscribeToNotificationLogs,
  saveNotificationLog,
  clearNotificationLogs,
} from './lib/firebase';
import type {
  JournalInteraction,
  UserProfile,
  ReflectionMode,
  LifeSector,
  CustomCategory,
  NotificationSettings,
  NotificationLog,
} from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { JournalSidebar } from './components/JournalSidebar';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { LifeJournalDashboard } from './components/LifeJournalDashboard';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CustomCategoriesModal } from './components/CustomCategoriesModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // App View State: 'dashboard' (Life Journal overview) or 'workspace' (Deep chat reflection)
  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace'>('dashboard');

  // Firestore Interactions state
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [isInteractionsLoading, setIsInteractionsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Custom Categories state
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isCustomCategoriesModalOpen, setIsCustomCategoriesModalOpen] = useState(false);

  // Notification Channels & Logs State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Deletion Modal state
  const [entryToDelete, setEntryToDelete] = useState<JournalInteraction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toasts notification system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUser(mapFirebaseUser(user));
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Create a brand new interaction session helper
  const createNewSession = useCallback((mode: ReflectionMode = 'reflection', sector: LifeSector = 'health'): JournalInteraction => {
    const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    return {
      id,
      userId: currentUser?.uid || '',
      title: 'New Reflection Entry',
      createdAt: now,
      updatedAt: now,
      mode,
      sector,
      moodScore: 7.5,
      messages: [],
      tags: [],
    };
  }, [currentUser?.uid]);

  // Subscribe to user interactions in Firestore when logged in
  useEffect(() => {
    if (!currentUser?.uid) {
      setInteractions([]);
      setActiveInteractionId(null);
      return;
    }

    setIsInteractionsLoading(true);

    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (items) => {
        setInteractions(items);
        setIsInteractionsLoading(false);

        // If no active interaction is selected, select the first if present
        setActiveInteractionId((prevId) => {
          if (prevId && items.some((it) => it.id === prevId)) {
            return prevId;
          }
          if (items.length > 0) {
            return items[0].id;
          }
          return null;
        });
      },
      (error) => {
        setIsInteractionsLoading(false);
        console.error('Firestore subscription error:', error);
        addToast({
          type: 'error',
          title: 'Database Sync Error',
          description: 'Could not synchronize reflections from Firestore. Check your connection.',
        });
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, addToast]);

  // Subscribe to user's custom categories in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setCustomCategories([]);
      return;
    }

    const unsubscribe = subscribeToCustomCategories(
      currentUser.uid,
      (categories) => {
        setCustomCategories(categories);
      },
      (error) => {
        console.error('Custom categories subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Subscribe to user's notification settings in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotificationSettings(null);
      return;
    }

    const unsubscribe = subscribeToNotificationSettings(
      currentUser.uid,
      (settings) => {
        setNotificationSettings(settings);
      },
      (error) => {
        console.error('Notification settings subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Subscribe to user's notification dispatch logs in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotificationLogs([]);
      return;
    }

    const unsubscribe = subscribeToNotificationLogs(
      currentUser.uid,
      (logs) => {
        setNotificationLogs(logs);
      },
      (error) => {
        console.error('Notification logs subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Save / Update notification settings
  const handleSaveNotificationSettings = async (settings: NotificationSettings) => {
    if (!currentUser?.uid) return;
    try {
      await saveNotificationSettings(currentUser.uid, settings);
      addToast({
        type: 'success',
        title: 'Notification Settings Saved',
        description: 'Your delivery channels and trigger preferences are updated.',
      });
    } catch (err: any) {
      console.error('Failed to save notification settings:', err);
      addToast({
        type: 'error',
        title: 'Settings Save Failed',
        description: err.message || 'Could not save notification settings.',
      });
    }
  };

  // Log a notification dispatch to Firestore
  const handleLogNotificationDispatch = async (log: NotificationLog) => {
    if (!currentUser?.uid) return;
    try {
      await saveNotificationLog(currentUser.uid, log);
    } catch (err) {
      console.error('Failed to write notification audit log:', err);
    }
  };

  // Clear notification audit logs
  const handleClearNotificationLogs = async () => {
    if (!currentUser?.uid) return;
    try {
      await clearNotificationLogs(currentUser.uid);
      addToast({
        type: 'info',
        title: 'Logs Cleared',
        description: 'Notification delivery history has been cleared.',
      });
    } catch (err: any) {
      console.error('Failed to clear notification logs:', err);
      addToast({
        type: 'error',
        title: 'Clear Failed',
        description: err.message || 'Could not clear history logs.',
      });
    }
  };

  // Save / update custom category
  const handleSaveCustomCategory = async (category: CustomCategory) => {
    if (!currentUser?.uid) return;
    try {
      await saveCustomCategory(currentUser.uid, category);
      addToast({
        type: 'success',
        title: 'Category Saved',
        description: `Custom category "${category.name}" was saved.`,
      });
    } catch (err: any) {
      console.error('Failed to save category:', err);
      addToast({
        type: 'error',
        title: 'Category Save Failed',
        description: err.message || 'Could not save category.',
      });
    }
  };

  // Delete custom category
  const handleDeleteCustomCategory = async (categoryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteCustomCategory(currentUser.uid, categoryId);
      addToast({
        type: 'info',
        title: 'Category Deleted',
        description: 'The custom category was removed.',
      });
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      addToast({
        type: 'error',
        title: 'Category Delete Failed',
        description: err.message || 'Could not delete category.',
      });
    }
  };

  // Determine the active interaction
  const activeInteraction = interactions.find((it) => it.id === activeInteractionId) || (
    currentUser ? createNewSession() : null
  );

  // Save / Update interaction handler with error recovery
  const handleUpdateInteraction = async (updated: JournalInteraction) => {
    if (!currentUser?.uid) return;

    setSaveStatus('saving');
    try {
      await saveUserInteraction(currentUser.uid, updated);
      setSaveStatus('saved');

      // Update local state immediately for seamless UX
      setInteractions((prev) => {
        const index = prev.findIndex((i) => i.id === updated.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updated;
          return next;
        } else {
          return [updated, ...prev];
        }
      });
      setActiveInteractionId(updated.id);
    } catch (err: any) {
      console.error('Error saving interaction to Firestore:', err);
      setSaveStatus('error');
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Your changes could not be saved to Firestore.',
        actionLabel: 'Retry Save',
        onAction: () => handleUpdateInteraction(updated),
      });
    }
  };

  // Prompt delete interaction modal
  const handlePromptDeleteInteraction = (interactionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser?.uid) return;

    const target = interactions.find((i) => i.id === interactionId) || (
      activeInteraction && activeInteraction.id === interactionId ? activeInteraction : null
    );

    if (target) {
      setEntryToDelete(target);
    }
  };

  // Confirmed delete execution
  const handleConfirmDelete = async () => {
    if (!currentUser?.uid || !entryToDelete) return;

    setIsDeleting(true);
    const targetId = entryToDelete.id;

    try {
      await deleteUserInteraction(currentUser.uid, targetId);

      // Optimistically update local interactions array
      setInteractions((prev) => prev.filter((i) => i.id !== targetId));

      addToast({
        type: 'info',
        title: 'Entry Deleted',
        description: `"${entryToDelete.title || 'Reflection'}" was removed from your journal.`,
      });

      if (activeInteractionId === targetId) {
        const remaining = interactions.filter((i) => i.id !== targetId);
        if (remaining.length > 0) {
          setActiveInteractionId(remaining[0].id);
        } else {
          setActiveInteractionId(null);
          setCurrentView('dashboard');
        }
      }

      setEntryToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete interaction:', err);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.message || 'Could not delete entry from Firestore.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartNewSession = () => {
    const newSession = createNewSession();
    setActiveInteractionId(newSession.id);
    handleUpdateInteraction(newSession);
    setCurrentView('workspace');
  };

  const handleSelectEntryFromDashboard = (entry: JournalInteraction) => {
    setActiveInteractionId(entry.id);
    setCurrentView('workspace');
  };

  const handleGoogleSignIn = async () => {
    setAuthErrorMessage(null);
    try {
      await signInWithGoogle();
      addToast({
        type: 'success',
        title: 'Signed In Successfully',
        description: 'Welcome to your private reflection workspace.',
      });
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in could not be completed.';
      setAuthErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        description: msg,
      });
    }
  };

  const handleGuestSignIn = async () => {
    setAuthErrorMessage(null);
    try {
      await signInAsGuest();
      addToast({
        type: 'success',
        title: 'Guest Session Active',
        description: 'You are signed in to an isolated guest sandbox.',
      });
    } catch (err: any) {
      const msg = err?.message || 'Could not start guest session.';
      setAuthErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Guest Sign In Failed',
        description: msg,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      addToast({
        type: 'info',
        title: 'Signed Out',
        description: 'You have securely signed out of ReflectAI.',
      });
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Loading Splash Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          Initializing ReflectAI...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Header */}
      <Navbar
        user={currentUser}
        currentView={currentView}
        onChangeView={(view) => setCurrentView(view)}
        onSignOut={handleSignOut}
        onNewSession={handleStartNewSession}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isSidebarOpen={isMobileSidebarOpen}
        notificationSettings={notificationSettings}
        notificationLogs={notificationLogs}
        onOpenNotificationSettings={() => setIsNotificationModalOpen(true)}
      />

      {/* Main Workspace or Landing Page */}
      {!currentUser ? (
        <LandingPage
          onGoogleSignIn={handleGoogleSignIn}
          onGuestSignIn={handleGuestSignIn}
          isLoading={isAuthLoading}
          errorMessage={authErrorMessage}
        />
      ) : (
        <main className="flex-1 flex overflow-hidden relative">
          {/* Desktop History Sidebar */}
          <div className="hidden lg:flex">
            <JournalSidebar
              interactions={interactions}
              activeInteractionId={activeInteractionId}
              onSelectInteraction={(id) => {
                setActiveInteractionId(id);
                setCurrentView('workspace');
              }}
              onNewInteraction={handleStartNewSession}
              onDeleteInteraction={(id, e) => handlePromptDeleteInteraction(id, e)}
              isLoading={isInteractionsLoading}
            />
          </div>

          {/* Mobile History Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 shadow-2xl z-10 flex flex-col border-r border-slate-800">
                <JournalSidebar
                  interactions={interactions}
                  activeInteractionId={activeInteractionId}
                  onSelectInteraction={(id) => {
                    setActiveInteractionId(id);
                    setCurrentView('workspace');
                    setIsMobileSidebarOpen(false);
                  }}
                  onNewInteraction={() => {
                    handleStartNewSession();
                    setIsMobileSidebarOpen(false);
                  }}
                  onDeleteInteraction={(id, e) => handlePromptDeleteInteraction(id, e)}
                  isLoading={isInteractionsLoading}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Dynamic Main View: Dashboard vs Workspace */}
          {currentView === 'dashboard' ? (
            <LifeJournalDashboard
              user={currentUser}
              interactions={interactions}
              onSaveEntry={handleUpdateInteraction}
              onSelectEntry={handleSelectEntryFromDashboard}
              onDeleteEntry={(id, e) => handlePromptDeleteInteraction(id, e)}
              customCategories={customCategories}
              onOpenCustomCategories={() => setIsCustomCategoriesModalOpen(true)}
              notificationSettings={notificationSettings}
              onOpenNotificationSettings={() => setIsNotificationModalOpen(true)}
              onLogNotificationDispatch={handleLogNotificationDispatch}
              onShowToast={addToast}
            />
          ) : activeInteraction ? (
            <ReflectionWorkspace
              key={activeInteraction.id}
              interaction={activeInteraction}
              onUpdateInteraction={handleUpdateInteraction}
              saveStatus={saveStatus}
              onRetrySave={() => handleUpdateInteraction(activeInteraction)}
              onDeleteSession={() => handlePromptDeleteInteraction(activeInteraction.id)}
              onBackToDashboard={() => setCurrentView('dashboard')}
              customCategories={customCategories}
              onOpenCustomCategories={() => setIsCustomCategoriesModalOpen(true)}
              notificationSettings={notificationSettings}
              onLogNotificationDispatch={handleLogNotificationDispatch}
              onShowToast={addToast}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
              <p className="text-slate-400 text-sm mb-4">No reflection selected.</p>
              <button
                onClick={handleStartNewSession}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Create New Entry
              </button>
            </div>
          )}
        </main>
      )}

      {/* Custom Categories Manager Modal */}
      {currentUser && (
        <CustomCategoriesModal
          isOpen={isCustomCategoriesModalOpen}
          onClose={() => setIsCustomCategoriesModalOpen(false)}
          userId={currentUser.uid}
          customCategories={customCategories}
          onSaveCategory={handleSaveCustomCategory}
          onDeleteCategory={handleDeleteCustomCategory}
        />
      )}

      {/* Notification Channels & Settings Modal */}
      {currentUser && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          userId={currentUser.uid}
          userEmail={currentUser.email}
          settings={notificationSettings}
          logs={notificationLogs}
          onSaveSettings={handleSaveNotificationSettings}
          onLogDispatch={handleLogNotificationDispatch}
          onClearLogs={handleClearNotificationLogs}
          onShowToast={addToast}
        />
      )}

      {/* In-App Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!entryToDelete}
        entry={entryToDelete}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setEntryToDelete(null);
        }}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
