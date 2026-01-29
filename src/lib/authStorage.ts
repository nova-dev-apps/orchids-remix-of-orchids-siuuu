import { supabase } from './supabase';

const ADMIN_EMAIL = 'abdisamadbashir14@gmail.com';
const ADMIN_PASSWORD = 'Xr7!vG$92dLq@Mez';

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 255) return false;
  
  // Strict regex: must have @, at least one dot in domain, and no spaces
  // Pattern: [chars]@[chars].[chars]
  const strictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!strictRegex.test(trimmed)) return false;
  
  // Ensure there is at least one dot in the domain part and it's not the last character
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
  
  return EMAIL_REGEX.test(trimmed.toLowerCase());
}

export interface UserAccount {
  email: string;
  passwordHash: string;
  createdAt: string;
  paymentStatus: 'pending' | 'completed';
  subscriptionId?: string;
  isAdmin: boolean;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}_${password.length}`;
}

export function isAdminCredentials(email: string, password: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export async function validateSignupEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!isValidEmail(normalizedEmail)) {
      return { success: false, error: 'Invalid email format. Please enter a valid email address.' };
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, payment_status')
      .eq('email', normalizedEmail)
      .single();
    
    if (existingUser && existingUser.payment_status === 'completed') {
      return { success: false, error: 'Account already exists. Please login.' };
    }
    
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}

// Save pending user to database when they enter credentials (before payment)
export async function savePendingUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('[savePendingUser] Saving pending user:', normalizedEmail);
    
    // Check if user already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, payment_status')
      .eq('email', normalizedEmail)
      .single();
    
    console.log('[savePendingUser] Existing user check:', { existingUser, selectError: selectError?.message });
    
    if (existingUser) {
      if (existingUser.payment_status === 'completed') {
        return { success: false, error: 'Account already exists. Please login.' };
      }
      // Update existing pending user with new password
      console.log('[savePendingUser] Updating existing pending user...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashPassword(password) })
        .eq('email', normalizedEmail);
      
      if (updateError) {
        console.error('[savePendingUser] Error updating pending user:', updateError);
        return { success: false, error: 'Failed to update account.' };
      }
      console.log('[savePendingUser] Updated existing pending user successfully');
      return { success: true };
    }
    
    // Insert new pending user
    console.log('[savePendingUser] Inserting new pending user...');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: normalizedEmail,
          password_hash: hashPassword(password),
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          is_admin: false
        }
      ])
      .select();
    
    if (insertError) {
      console.error('[savePendingUser] Error saving pending user:', insertError);
      return { success: false, error: 'Failed to save account: ' + insertError.message };
    }
    
    console.log('[savePendingUser] Successfully saved pending user:', insertData);
    return { success: true };
  } catch (err) {
    console.error('[savePendingUser] Error in savePendingUser:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function verifyUserAfterPayment(
  email: string, 
  password?: string,
  subscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();
    const subscriptionEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    console.log('[verifyUserAfterPayment] Verifying payment for:', normalizedEmail);
    
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    console.log('[verifyUserAfterPayment] Existing user:', { existingUser: !!existingUser, selectError: selectError?.message });
    
    if (!existingUser) {
      if (!password) {
        return { success: false, error: 'Account credentials missing.' };
      }
      
      console.log('[verifyUserAfterPayment] Creating new paid user...');
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            email: normalizedEmail,
            password_hash: hashPassword(password),
            payment_status: 'completed',
            subscription_started_at: now.toISOString(),
            subscription_ends_at: subscriptionEndsAt.toISOString(),
            is_admin: false
          }
        ])
        .select();
      
      if (insertError) {
        console.error('[verifyUserAfterPayment] Insert error:', insertError);
        return { success: false, error: 'Failed to create account: ' + insertError.message };
      }
      console.log('[verifyUserAfterPayment] Created new paid user:', insertData);
    } else {
      const updateData: any = {
        payment_status: 'completed',
        subscription_started_at: now.toISOString(),
        subscription_ends_at: subscriptionEndsAt.toISOString()
      };
      
      if (password && !existingUser.password_hash) {
        updateData.password_hash = hashPassword(password);
      }
      
      console.log('[verifyUserAfterPayment] Updating user to paid status...');
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', normalizedEmail)
        .select();
      
      if (updateError) {
        console.error('[verifyUserAfterPayment] Update error:', updateError);
        return { success: false, error: 'Failed to verify account: ' + updateError.message };
      }
      console.log('[verifyUserAfterPayment] Updated user to paid:', updateResult);
    }
    
    return { success: true };
  } catch (err) {
    console.error('[verifyUserAfterPayment] Error in verifyUserAfterPayment:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function validateLogin(
  email: string, 
  password: string
): Promise<{ success: boolean; isAdmin: boolean; error?: string }> {
  if (email.toLowerCase().trim() === ADMIN_EMAIL) {
    if (password === ADMIN_PASSWORD) {
      return { success: true, isAdmin: true };
    } else {
      return { success: false, isAdmin: false, error: 'Invalid admin credentials.' };
    }
  }
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    if (error || !userData) {
      return { success: false, isAdmin: false, error: 'Account not found. Please sign up and complete payment.' };
    }
    
    if (userData.payment_status !== 'completed') {
      return { success: false, isAdmin: false, error: 'Payment not completed.' };
    }
    
    if (userData.subscription_ends_at) {
      const endsAt = new Date(userData.subscription_ends_at);
      if (endsAt.getTime() < Date.now()) {
        return { success: false, isAdmin: false, error: 'Subscription expired. Please renew.' };
      }
    }
    
    const inputHash = hashPassword(password);
    if (userData.password_hash !== inputHash) {
      return { success: false, isAdmin: false, error: 'Invalid password.' };
    }
    
    return { success: true, isAdmin: false };
  } catch (err) {
    console.error('Error in validateLogin:', err);
    return { success: false, isAdmin: false, error: 'An unexpected error occurred.' };
  }
}

export async function deletePendingUser(email: string): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    await supabase.from('users').delete().eq('email', normalizedEmail).neq('payment_status', 'completed');
  } catch (err) {
    console.error('Error deleting pending user:', err);
  }
}

export async function getUserData(email: string): Promise<UserAccount | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    if (error || !data) return null;
    
    return {
      email: data.email,
      passwordHash: data.password_hash,
      createdAt: data.created_at,
      paymentStatus: data.payment_status === 'completed' ? 'completed' : 'pending',
      subscriptionId: undefined,
      isAdmin: data.is_admin || false,
      subscriptionStartedAt: data.subscription_started_at,
      subscriptionEndsAt: data.subscription_ends_at
    };
  } catch {
    return null;
  }
}

export interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  paidUsers: number;
  pendingUsers: number;
  pendingGoogleUsers: number;
  usersByDate: { date: string; count: number }[];
}

export async function cleanupOldPendingUsers(): Promise<{ deletedCount: number }> {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString();
    
    console.log('[cleanupOldPendingUsers] Cleaning up pending users older than:', cutoffDate);
    
    const { data: oldPendingUsers, error: selectError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('payment_status', 'pending')
      .lt('created_at', cutoffDate);
    
    if (selectError) {
      console.error('[cleanupOldPendingUsers] Error finding old pending users:', selectError);
      return { deletedCount: 0 };
    }
    
    if (!oldPendingUsers || oldPendingUsers.length === 0) {
      console.log('[cleanupOldPendingUsers] No old pending users to delete');
      return { deletedCount: 0 };
    }
    
    console.log('[cleanupOldPendingUsers] Found old pending users to delete:', oldPendingUsers.map(u => u.email));
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('payment_status', 'pending')
      .lt('created_at', cutoffDate);
    
    if (deleteError) {
      console.error('[cleanupOldPendingUsers] Error deleting old pending users:', deleteError);
      return { deletedCount: 0 };
    }
    
    console.log('[cleanupOldPendingUsers] Successfully deleted', oldPendingUsers.length, 'old pending users');
    return { deletedCount: oldPendingUsers.length };
  } catch (err) {
    console.error('[cleanupOldPendingUsers] Unexpected error:', err);
    return { deletedCount: 0 };
  }
}

export async function getAllUserStats(): Promise<UserStats> {
  try {
    console.log('[getAllUserStats] Fetching users from database...');
    
    // Attempt cleanup but don't let it block stats if it fails
    try {
      await cleanupOldPendingUsers();
    } catch (cleanupErr) {
      console.error('[getAllUserStats] Cleanup failed (non-blocking):', cleanupErr);
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('[getAllUserStats] Database error:', error);
      // Return hardcoded base if DB fails, but with a warning
      return {
        totalUsers: 1,
        verifiedUsers: 1,
        paidUsers: 0,
        pendingUsers: 0,
        usersByDate: []
      };
    }
    
    console.log(`[getAllUserStats] Found ${users?.length || 0} users in DB`);
    
    const ADMIN_EMAIL = 'abdisamadbashir14@gmail.com';
    const verifiedCount = 1; // Fixed admin
    
    // Filter users, making sure to exclude the admin from these counts
    // Paid users = specifically status 'completed'
    const paidUsersList = users.filter(u => 
      u.payment_status === 'completed' && 
      u.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()
    );
    const paidCount = paidUsersList.length;
    
    // Pending users = specifically status 'pending'
    const pendingUsersList = users.filter(u => 
      u.payment_status === 'pending' && 
      u.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()
    );
    const pendingCount = pendingUsersList.length;
    
    // Pending Google users = pending + auth_provider = 'google'
    const pendingGoogleUsersList = users.filter(u => 
      u.payment_status === 'pending' && 
      u.auth_provider === 'google' &&
      u.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()
    );
    const pendingGoogleCount = pendingGoogleUsersList.length;
    
    console.log('[getAllUserStats] Calculated counts:', { verifiedCount, paidCount, pendingCount, pendingGoogleCount });
    
    // Group by date for the chart
    const dateGroups: Record<string, number> = {};
    users.forEach(u => {
      if (u.created_at) {
        const date = String(u.created_at).split('T')[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      }
    });
    
    const usersByDate = Object.entries(dateGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    
    return {
      totalUsers: verifiedCount + paidCount + pendingCount,
      verifiedUsers: verifiedCount,
      paidUsers: paidCount,
      pendingUsers: pendingCount,
      pendingGoogleUsers: pendingGoogleCount,
      usersByDate
    };
  } catch (err) {
    console.error('[getAllUserStats] Fatal error:', err);
    return {
      totalUsers: 1,
      verifiedUsers: 1,
      paidUsers: 0,
      pendingUsers: 0,
      pendingGoogleUsers: 0,
      usersByDate: []
    };
  }
}

export async function getSubscriptionInfo(email: string): Promise<{
  startedAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  remainingMs: number;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const { data } = await supabase
      .from('users')
      .select('subscription_started_at, subscription_ends_at')
      .eq('email', normalizedEmail)
      .single();
    
    if (data && data.subscription_ends_at) {
      const endsAt = new Date(data.subscription_ends_at);
      const now = new Date();
      const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
      
      return {
        startedAt: data.subscription_started_at,
        endsAt: data.subscription_ends_at,
        isActive: remainingMs > 0,
        remainingMs
      };
    }
  } catch (e) {
    console.error('Error getting subscription info:', e);
  }
  
  return {
    startedAt: null,
    endsAt: null,
    isActive: false,
    remainingMs: 0
  };
}
