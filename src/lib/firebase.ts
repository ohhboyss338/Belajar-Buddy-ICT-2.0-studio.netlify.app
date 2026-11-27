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

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/invalid-credential':
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
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized in Firebase Authentication. Add your domain in Firebase Console -> Authentication -> Settings -> Authorized domains.';
    case 'auth/invalid-api-key':
      return 'Firebase API key configuration is invalid. Check your Firebase settings.';
    default:
      if (error instanceof Error) {
        if (error.message.startsWith('{') && error.message.includes('"operationType"')) {
          return 'Database permission error. Ensure Email/Password sign-in is configured and Firestore rules are deployed.';
        }
        return error.message;
      }
      return 'Authentication failed. Please try again.';
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
