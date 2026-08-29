import React, { useState } from 'react';
import { SectorCards } from './SectorCards';
import { QuickComposer } from './QuickComposer';
import { RecentEntriesFeed } from './RecentEntriesFeed';
import { WeeklySummaryWidget } from './WeeklySummaryWidget';
import { MediaViewerModal } from './MediaViewerModal';
import type {
  JournalInteraction,
  LifeSector,
  MediaAttachment,
  UserProfile,
  CustomCategory,
  NotificationSettings,
  NotificationLog,
} from '../types';

interface LifeJournalDashboardProps {
  user: UserProfile;
  interactions: JournalInteraction[];
  onSaveEntry: (entry: JournalInteraction) => Promise<void>;
  onSelectEntry: (entry: JournalInteraction) => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  customCategories?: CustomCategory[];
  onOpenCustomCategories?: () => void;
  notificationSettings?: NotificationSettings | null;
  onOpenNotificationSettings?: () => void;
  onLogNotificationDispatch?: (log: NotificationLog) => Promise<void>;
  onShowToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; description: string }) => void;
}

export const LifeJournalDashboard: React.FC<LifeJournalDashboardProps> = ({
  user,
  interactions,
  onSaveEntry,
  onSelectEntry,
  onDeleteEntry,
  customCategories = [],
  onOpenCustomCategories,
  notificationSettings,
  onOpenNotificationSettings,
  onLogNotificationDispatch,
  onShowToast,
}) => {
  const [selectedSector, setSelectedSector] = useState<LifeSector | 'all'>('all');
  const [viewingMedia, setViewingMedia] = useState<{
    media: MediaAttachment;
    title: string;
  } | null>(null);

  return (
    <div id="life-journal-dashboard" className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. Multi-Sector Cards Grid/Carousel */}
        <SectorCards
          interactions={interactions}
          selectedSector={selectedSector}
          onSelectSector={(sector) => setSelectedSector(sector)}
          customCategories={customCategories}
          onOpenCustomCategories={onOpenCustomCategories}
        />

        {/* 2. "✍️ What's on your mind today?" Quick Composer */}
        <QuickComposer
          userId={user.uid}
          onSaveEntry={onSaveEntry}
          onOpenWorkspace={onSelectEntry}
          defaultSector={selectedSector}
          customCategories={customCategories}
        />

        {/* 3. Recent Entries Feed with Search, Advanced Filters, Tags & Context preview */}
        <RecentEntriesFeed
          interactions={interactions}
          selectedSector={selectedSector}
          onSelectEntry={onSelectEntry}
          onDeleteEntry={onDeleteEntry}
          onOpenMediaModal={(media, title) => setViewingMedia({ media, title })}
          customCategories={customCategories}
          onOpenCustomCategories={onOpenCustomCategories}
        />

        {/* 4. 📊 This Week's Summary Dashboard Widget */}
        <WeeklySummaryWidget
          interactions={interactions}
          userId={user.uid}
          userEmail={user.email}
          notificationSettings={notificationSettings}
          onOpenNotificationSettings={onOpenNotificationSettings}
          onLogNotificationDispatch={onLogNotificationDispatch}
          onShowToast={onShowToast}
        />
      </div>

      {/* Media Viewer Modal */}
      {viewingMedia && (
        <MediaViewerModal
          media={viewingMedia.media}
          entryTitle={viewingMedia.title}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
};
