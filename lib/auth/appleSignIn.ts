import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

/**
 * Perform native Apple Sign-In and authenticate with Supabase.
 * Returns the Supabase session on success.
 * Throws on cancellation or error.
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  // Generate a random nonce for security
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  // Present the native Apple sign-in sheet
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple');
  }

  // Exchange Apple identity token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  return { session: data.session, credential };
}
