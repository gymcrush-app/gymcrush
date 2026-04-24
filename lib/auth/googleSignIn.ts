import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const WEB_CLIENT_ID =
  '281744902925-utuv5c3aje8hiknh3hnhb1rqkt1tdt1t.apps.googleusercontent.com';
const IOS_CLIENT_ID =
  '281744902925-kp7ojjbkpbsvn1ue9js637f5l77e3kbr.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
});

export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleSignInCancelled';
  }
}

/**
 * Perform native Google Sign-In and authenticate with Supabase.
 * Throws on cancellation or error.
 */
export async function signInWithGoogle() {
  if (Platform.OS !== 'ios') {
    throw new Error('Google Sign-In is only wired for iOS right now');
  }

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new GoogleSignInCancelled();
    }

    const idToken = response.data.idToken;
    if (!idToken) throw new Error('No ID token returned from Google');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;

    return { session: data.session, user: response.data.user };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
