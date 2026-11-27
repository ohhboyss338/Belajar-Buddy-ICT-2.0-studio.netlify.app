import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const DEFAULT_TEACHER_CODE_DIGEST =
  '78ebd19b11ac5f31df75eda86b70aa1feb9a7b361e020ce4f183697faa348321';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'ohhboyss338@gmail.com';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

const firebaseConfig: FirebaseOptions & { firestoreDatabaseId?: string } = {
  apiKey: env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Keep users signed in across page refreshes using Firebase's persistent local storage
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set browserLocalPersistence:', err);
});

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (Firestore client is offline).');
    }
  }
}

void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function formatFirestoreJsonError(
  rawMessage: string,
  fallback: string
): string | null {
  const trimmed = rawMessage.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('"operationType"')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<FirestoreErrorInfo>;
    const inner = String(parsed.error || '').toLowerCase();
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;

    if (
      inner.includes('quota exceeded') ||
      inner.includes('free daily read units') ||
      inner.includes('resource-exhausted')
    ) {
      return `Daily database read quota reached. The free-tier quota resets tomorrow, or your administrator can upgrade in Firebase Console: ${upgradeUrl}`;
    }

    if (
      inner.includes('the client is offline') ||
      inner.includes('offline') ||
      inner.includes('unavailable') ||
      inner.includes('network')
    ) {
      return 'Network issue: unable to reach Firestore because your connection is offline or unavailable. Check your internet connection and try again.';
    }

    if (inner.includes('unauthenticated')) {
      return 'Your session has expired. Please log out and sign back in to continue.';
    }

    if (
      inner.includes('missing or insufficient permissions') ||
      inner.includes('permission-denied')
    ) {
      if (parsed.path?.startsWith('users/') || parsed.path?.startsWith('admins/')) {
        return 'Database permission error while accessing your account profile. Please log out and sign back in, or verify Firestore rules are deployed.';
      }
      return `Database permission error${parsed.path ? ` (${parsed.path})` : ''}. Please make sure you are signed in with the required permissions and Firestore rules are deployed.`;
    }

    return fallback;
  } catch {
    return 'Database permission or configuration error. Please sign out and sign back in, or verify your Firestore rules.';
  }
}

export function mapFirebaseAuthError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in or use Forgot Password.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your teacher or administrator.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again, or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error: unable to reach Firebase Authentication. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console yet. Enable it under Authentication -> Sign-in method -> Email/Password.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project yet. Enable Email/Password under Authentication -> Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized in Firebase Authentication. Add your domain in Firebase Console -> Authentication -> Settings -> Authorized domains.';
    case 'auth/invalid-api-key':
      return 'Firebase API key configuration is invalid. Check your Firebase settings.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Your login session has expired. Please sign out and sign back in to continue.';
    case 'auth/quota-exceeded':
      return 'Authentication request limit reached temporarily. Please wait a moment and try again.';
    case 'auth/internal-error':
      return 'Authentication service encountered a temporary error. Please check your connection and try again.';
    case 'permission-denied':
      return 'Database permission error. Please sign out and sign back in, or verify Firestore rules are deployed.';
    case 'unavailable':
      return 'Database is temporarily unavailable. Check your internet connection and try again.';
    case 'resource-exhausted': {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      return `Daily database quota reached. The free-tier quota resets tomorrow, or your administrator can upgrade in Firebase Console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
    }
    default: {
      if (error instanceof Error) {
        const formattedJson = formatFirestoreJsonError(error.message, fallback);
        if (formattedJson) {
          return formattedJson;
        }
        const lower = error.message.toLowerCase();
        if (lower.includes('quota exceeded') || lower.includes('free daily read units')) {
          const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
          return `Daily database read quota reached. The free-tier quota resets tomorrow, or your administrator can upgrade in Firebase Console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
        }
        if (lower.includes('the client is offline')) {
          return 'You appear to be offline. Reconnect to the internet and try again.';
        }
        return error.message || fallback;
      }
      if (typeof error === 'string' && error.trim()) {
        const formattedJson = formatFirestoreJsonError(error, fallback);
        return formattedJson || error;
      }
      return fallback;
    }
  }
}

export const formatFirebaseError = mapFirebaseAuthError;

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
