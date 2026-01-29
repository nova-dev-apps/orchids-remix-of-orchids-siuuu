import { supabase, supabaseAdmin } from './supabase';

const ADMIN_EMAILS = [
  'abdisamadbashir14@gmail.com',
  'nova.platforms.ai@gmail.com'
];

const isAdminEmailCheck = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

export const GOOGLE_SCOPES = [
  'openid',
  'email', 
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/tasks',
  'https://mail.google.com/',
].join(' ');

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  isPendingPayment?: boolean;
  isAdmin?: boolean;
  email?: string;
}

export async function signInWithGoogle(isSignup: boolean = false): Promise<{ error?: string }> {
  const redirectUrl = `${window.location.origin}/auth/callback${isSignup ? '?signup=true' : ''}`;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    console.error('[GoogleAuth] OAuth error:', error);
    return { error: error.message };
  }

  return {};
}

export async function handleGoogleCallback(isSignup: boolean): Promise<GoogleAuthResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[GoogleAuth] Session error:', sessionError);
      return { success: false, error: 'Failed to get session' };
    }

    const email = session.user?.email?.toLowerCase().trim();
    if (!email) {
      return { success: false, error: 'No email found in session' };
    }

    const isAdmin = isAdminEmailCheck(email);
    const providerToken = session.provider_token;
    const providerRefreshToken = session.provider_refresh_token;

    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (isSignup) {
      if (existingUser && existingUser.payment_status === 'completed') {
        return { 
          success: false, 
          error: 'Account already exists. Please login instead.',
          email 
        };
      }

      if (!existingUser) {
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert([{
            email,
            password_hash: `google_oauth_${session.user.id}`,
            payment_status: 'pending',
            is_admin: isAdmin,
            auth_provider: 'google',
            google_id: session.user.id,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('[GoogleAuth] Insert error:', insertError);
          return { success: false, error: 'Failed to create account' };
        }
      }

      if (providerToken) {
        await saveGoogleTokens(email, providerToken, providerRefreshToken || null);
      }

      return { 
        success: true, 
        isNewUser: true, 
        isPendingPayment: true, 
        isAdmin,
        email 
      };
    } else {
      if (isAdmin) {
        if (providerToken) {
          await saveGoogleTokens(email, providerToken, providerRefreshToken || null);
        }
        return { success: true, isAdmin: true, email };
      }

      if (!existingUser) {
        return { 
          success: false, 
          error: 'Account not found. Please sign up first.',
          isPendingPayment: true,
          email 
        };
      }

      if (existingUser.payment_status !== 'completed') {
        return { 
          success: false, 
          error: 'Payment not completed. Please complete payment to access.',
          isPendingPayment: true,
          email 
        };
      }

      if (existingUser.subscription_ends_at) {
        const endsAt = new Date(existingUser.subscription_ends_at);
        if (endsAt.getTime() < Date.now()) {
          return { 
            success: false, 
            error: 'Subscription expired. Please renew.',
            isPendingPayment: true,
            email 
          };
        }
      }

      if (providerToken) {
        await saveGoogleTokens(email, providerToken, providerRefreshToken || null);
      }

      return { success: true, isAdmin: false, email };
    }
  } catch (err) {
    console.error('[GoogleAuth] Callback error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function saveGoogleTokens(
  email: string, 
  accessToken: string, 
  refreshToken: string | null
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('google_tokens')
      .select('id')
      .eq('user_email', email)
      .single();

    const tokenData = {
      user_email: email,
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from('google_tokens')
        .update(tokenData)
        .eq('user_email', email);

      if (error) {
        console.error('[GoogleAuth] Token update error:', error);
        return false;
      }
    } else {
      const { error } = await supabaseAdmin
        .from('google_tokens')
        .insert([{
          ...tokenData,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('[GoogleAuth] Token insert error:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[GoogleAuth] Save tokens error:', err);
    return false;
  }
}

export async function getGoogleTokens(email: string): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token')
      .eq('user_email', email)
      .single();

    if (error || !data) return null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  } catch {
    return null;
  }
}

export async function refreshGoogleToken(email: string): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session) {
      console.error('[GoogleAuth] Refresh error:', error);
      return null;
    }

    const newToken = session.provider_token;
    if (newToken) {
      await saveGoogleTokens(email, newToken, session.provider_refresh_token || null);
    }

    return newToken || null;
  } catch {
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  await supabase.auth.signOut();
}

export function isAdminEmail(email: string): boolean {
  return isAdminEmailCheck(email);
}

export async function getPendingGoogleUsers(): Promise<Array<{
  email: string;
  createdAt: string;
  authProvider: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, created_at, auth_provider')
      .eq('payment_status', 'pending')
      .eq('auth_provider', 'google')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(u => ({
      email: u.email,
      createdAt: u.created_at,
      authProvider: u.auth_provider || 'google'
    }));
  } catch {
    return [];
  }
}

export async function verifyGoogleUserAfterPayment(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();
    const subscriptionEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        payment_status: 'completed',
        subscription_started_at: now.toISOString(),
        subscription_ends_at: subscriptionEndsAt.toISOString()
      })
      .eq('email', normalizedEmail);

    if (error) {
      console.error('[GoogleAuth] Payment verification error:', error);
      return { success: false, error: 'Failed to verify payment' };
    }

    return { success: true };
  } catch (err) {
    console.error('[GoogleAuth] Payment verification error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
