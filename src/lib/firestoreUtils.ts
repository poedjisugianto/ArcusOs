import { auth } from '../firebase';

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const SHARD_MAX_SIZE = 500000; // 500KB - more safe for Firestore overhead

export function shardData(data: any): string[] {
  const json = JSON.stringify(data);
  const shards = [];
  let i = 0;
  while (i < json.length) {
    shards.push(json.slice(i, i + SHARD_MAX_SIZE));
    i += SHARD_MAX_SIZE;
  }
  return shards;
}

export function tryRecoverJSON(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e: any) {
    console.warn("Corrupted JSON detected, attempting recovery:", e.message);
    const endChars = [']', '}'];
    for (const char of endChars) {
      let lastIndex = text.lastIndexOf(char);
      // Limit attempts to avoid freezing the browser if data is gigantic
      let attempts = 0;
      while (lastIndex > 0 && attempts < 20) {
        attempts++;
        try {
          const candidate = text.substring(0, lastIndex + 1);
          const parsed = JSON.parse(candidate);
          console.log(`Successfully recovered JSON after ${attempts} attempts.`);
          return parsed;
        } catch (inner) {
          lastIndex = text.lastIndexOf(char, lastIndex - 1);
        }
      }
    }
    
    // Last ditch: if it's a sharded array that got doubled, try to find the start of the second array
    if (text.includes('][')) {
      const parts = text.split('][');
      try { return JSON.parse(parts[0] + ']'); } catch(e) {}
    }
    
    console.error("Recovery failed. Text preview:", text.substring(0, 100));
    throw e;
  }
}

export function mergeShards(shards: string[]): any {
  if (!shards.length) return null;
  const merged = shards.filter(s => typeof s === 'string').join('');
  return tryRecoverJSON(merged);
}
