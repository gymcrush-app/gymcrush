/**
 * Profile photo upload to Supabase Storage (avatars bucket).
 * Uploads local URIs and returns public URLs for storage in profiles.photo_urls.
 */

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, supabaseUrl } from '@/lib/supabase';

const BUCKET = 'avatars';

function base64ToUint8Array(base64: string): Uint8Array {
  // atob is available in Expo runtime.
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isStorageUrl(uri: string): boolean {
  return (
    typeof uri === 'string' &&
    uri.startsWith('https://') &&
    uri.includes(supabaseUrl) &&
    uri.includes('/storage/v1/object/public/')
  );
}

/**
 * Upload a single local file URI to avatars/{userId}/{uuid}.jpg and return its public URL.
 * If the URI is already a storage public URL, returns it as-is.
 */
export async function uploadProfilePhoto(userId: string, localUri: string): Promise<string> {
  if (isStorageUrl(localUri)) {
    return localUri;
  }

  // `fetch(file://...)` can produce 0-byte blobs in some RN/Expo runtimes.
  // Use FileSystem base64 read to ensure we upload actual bytes.
  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });
  } catch (e) {
    throw new Error(
      e instanceof Error ? `Failed to read image: ${e.message}` : 'Failed to read image'
    );
  }
  const bytes = base64ToUint8Array(base64);

  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload multiple local URIs and return public URLs in the same order.
 * Fails entirely if any upload fails.
 */
export async function uploadProfilePhotos(userId: string, localUris: string[]): Promise<string[]> {
  const results = await Promise.all(
    localUris.map((uri) => uploadProfilePhoto(userId, uri))
  );
  return results;
}

/**
 * Resolve a mix of existing storage URLs and local URIs to all public URLs.
 * Existing https storage URLs are kept; local URIs are uploaded and replaced.
 */
export async function resolvePhotoUrls(
  userId: string,
  urlsOrUris: string[]
): Promise<string[]> {
  const results = await Promise.all(
    urlsOrUris.map((item) =>
      isStorageUrl(item) ? Promise.resolve(item) : uploadProfilePhoto(userId, item)
    )
  );
  return results;
}
