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

export const SHARD_MAX_SIZE = 800000; // 800KB

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

export function mergeShards(shards: string[]): any {
  if (!shards.length) return null;
  // Filter out any holes or nulls that might have happened during reconstruction
  const merged = shards.filter(s => typeof s === 'string').join('');
  
  try {
    return JSON.parse(merged);
  } catch (e) {
    // If it fails with "unexpected non-whitespace character" it might be because 
    // old shards were leftover. We try to find the first complete JSON object.
    console.warn("Corrupted JSON detected in shards, attempting recovery...");
    
    // Heuristic: if we have multiple JSON objects joined, the error often happens 
    // after the first valid closing brace.
    try {
      // Find the last closing brace and try parsing substrings (inefficient but better than crashing)
      let lastBrace = merged.lastIndexOf('}');
      while (lastBrace > 0) {
        try {
          const candidate = merged.substring(0, lastBrace + 1);
          return JSON.parse(candidate);
        } catch (inner) {
          lastBrace = merged.lastIndexOf('}', lastBrace - 1);
        }
      }
    } catch (recoveryError) {
      console.error("Shard recovery failed entirely");
    }
    
    throw e;
  }
}
