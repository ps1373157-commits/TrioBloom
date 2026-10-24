import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export { Timestamp, serverTimestamp };

// Error handling types according to firebase-integration skill
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Critical Constraint: Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Entities
export interface MemberProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  flowerTag: string;
  isApproved: boolean;
  role: 'admin' | 'member';
  bio?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface WallPostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  flowerSticker: string;
  likesCount: number;
  likedBy: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ConversationItem {
  id: string;
  type: 'group' | 'private';
  participantIds: string[];
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageAt?: any;
  updatedAt?: any;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  readBy?: string[];
  createdAt?: any;
}

export interface QuizScoreItem {
  id: string;
  userId: string;
  userName: string;
  score: number;
  total: number;
  flowerPersona: string;
  createdAt?: any;
}
