
import { supabase } from './supabaseClient.js';

/**
 * Upload file to private Supabase storage bucket
 */
export async function uploadPrivateMedia(bucketName, file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User unauthenticated');

  const fileExt = file.name.split('.').pop();
  const filePath = `\({user.id}/\){Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) throw error;
  return data.path;
}

/**
 * Generate a signed URL for private bucket media
 */
export async function getSignedUrl(bucketName, filePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
