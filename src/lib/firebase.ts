import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import type {
  JournalInteraction,
  UserProfile,
  CustomCategory,
  NotificationSettings,
  NotificationLog,
} from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use the databaseId provisioned for this applet
export const db = getFirestore(
  app,
  firebaseConfigData.firestoreDatabaseId || '(default)'
);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively removes all `undefined` properties from an object or array before Firestore submission.
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as any;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizePayload(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

/**
 * Sign in using Google Popup with error handling
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    // If popup is blocked or closed by user in sandboxed iframe, suggest fallback
    throw error;
  }
}

/**
 * Demo / Guest sign in for instant sandbox exploration
 */
export async function signInAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error('Guest Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out helper
 */
export async function logOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Maps Firebase User to standard UserProfile
 */
export function mapFirebaseUser(user: User | null): UserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || (user.isAnonymous ? 'Guest Explorer' : 'Journaler'),
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Firestore Interaction Operations
 * Strictly isolated to /users/{userId}/interactions/{interactionId}
 */

export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalInteraction;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      onError(error);
    }
  );
}

export async function saveUserInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to persist interaction.');
  }

  const path = `users/${userId}/interactions/${interaction.id}`;
  try {
    const sanitized = sanitizePayload({
      ...interaction,
      userId,
      updatedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('User ID and Interaction ID are required for deletion.');
  }
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Custom Categories Firestore Operations
 * Isolated to /users/{userId}/custom_categories/{categoryId}
 */

export function subscribeToCustomCategories(
  userId: string,
  onUpdate: (categories: CustomCategory[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const categoriesRef = collection(db, 'users', userId, 'custom_categories');
  const q = query(categoriesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CustomCategory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CustomCategory;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore custom categories subscription error:', error);
      onError(error);
    }
  );
}

export async function saveCustomCategory(
  userId: string,
  category: CustomCategory
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to persist custom category.');
  }

  const path = `users/${userId}/custom_categories/${category.id}`;
  try {
    const sanitized = sanitizePayload({
      ...category,
      userId,
      updatedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'users', userId, 'custom_categories', category.id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomCategory(
  userId: string,
  categoryId: string
): Promise<void> {
  if (!userId || !categoryId) {
    throw new Error('User ID and Category ID are required for deletion.');
  }
  const path = `users/${userId}/custom_categories/${categoryId}`;
  try {
    const docRef = doc(db, 'users', userId, 'custom_categories', categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Notification Settings & Dispatch Logs Firestore Operations
 * Isolated to /users/{userId}/notification_settings/main and /users/{userId}/notification_logs/{logId}
 */

export const DEFAULT_NOTIFICATION_SETTINGS: Omit<NotificationSettings, 'userId' | 'updatedAt'> = {
  emailEnabled: true,
  recipientEmail: '',
  emailTriggers: {
    weeklyDigest: true,
    dailyReminder: false,
    reflectionSummary: true,
    milestoneAlerts: true,
  },
  slackEnabled: false,
  slackWebhookUrl: '',
  slackChannelName: '#daily-journal',
  slackBotName: 'ReflectAI Life Journal',
  slackTriggers: {
    weeklyDigest: true,
    dailyReminder: false,
    reflectionSummary: true,
    milestoneAlerts: true,
  },
  reminderTime: '20:00',
};

export function subscribeToNotificationSettings(
  userId: string,
  onUpdate: (settings: NotificationSettings | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'notification_settings', 'main');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as NotificationSettings);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error('Firestore notification settings subscription error:', error);
      onError(error);
    }
  );
}

export async function saveNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to persist notification settings.');
  }

  const path = `users/${userId}/notification_settings/main`;
  try {
    const sanitized = sanitizePayload({
      ...settings,
      userId,
      updatedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'users', userId, 'notification_settings', 'main');
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToNotificationLogs(
  userId: string,
  onUpdate: (logs: NotificationLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const logsRef = collection(db, 'users', userId, 'notification_logs');
  const q = query(logsRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: NotificationLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as NotificationLog;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore notification logs subscription error:', error);
      onError(error);
    }
  );
}

export async function saveNotificationLog(
  userId: string,
  log: NotificationLog
): Promise<void> {
  if (!userId) return;

  const path = `users/${userId}/notification_logs/${log.id}`;
  try {
    const sanitized = sanitizePayload({
      ...log,
      userId,
    });

    const docRef = doc(db, 'users', userId, 'notification_logs', log.id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearNotificationLogs(
  userId: string,
  logs?: NotificationLog[]
): Promise<void> {
  if (!userId) return;

  try {
    if (logs && logs.length > 0) {
      await Promise.all(
        logs.map((l) => deleteDoc(doc(db, 'users', userId, 'notification_logs', l.id)))
      );
    } else {
      const logsRef = collection(db, 'users', userId, 'notification_logs');
      const snapshot = await getDocs(logsRef);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notification_logs`);
  }
}

