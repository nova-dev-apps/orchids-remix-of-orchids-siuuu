import { supabase } from './supabase';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  attachments?: any[];
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  messages: Message[];
  activeTab?: string;
}

const TABLE = 'ai_behavior_settings';

const makeId = (userId: string, type: string, subId?: string) => 
  subId ? `chat_${type}_${userId}_${subId}` : `chat_${type}_${userId}`;

export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  // Use email as user ID to match AIChat.tsx which uses email as currentUserId
  return user?.email?.toLowerCase().trim() || user?.id || null;
}

export async function getAllSessions(userId: string): Promise<ChatSession[]> {
  try {
    // Query by user_id column which is simpler and more reliable
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, content')
      .eq('user_id', userId)
      .like('id', 'chat_session_%')
      .order('updated_at', { ascending: false });
    
    console.log('[chatStorage] getAllSessions for:', userId, 'result:', data?.length, error);
    
    if (error || !data) return [];
    
    return data
      .map(row => {
        try {
          return JSON.parse(row.content);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ChatSession[];
  } catch (e) {
    console.error('[chatStorage] getAllSessions error:', e);
    return [];
  }
}

export async function clearAllSessions(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .like('id', `chat_session_${userId}_%`);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', makeId(userId, 'session', sessionId));
    return !error;
  } catch {
    return false;
  }
}

export async function renameSession(userId: string, sessionId: string, newTitle: string): Promise<boolean> {
  const session = await loadSession(userId, sessionId);
  if (!session) return false;
  session.title = newTitle;
  return saveSession(userId, session);
}

export async function loadSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('content')
      .eq('id', makeId(userId, 'session', sessionId))
      .single();
    
    if (error || !data?.content) return null;
    return JSON.parse(data.content);
  } catch {
    return null;
  }
}

export async function saveSession(userId: string, session: ChatSession): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        id: makeId(userId, 'session', session.id),
        user_id: userId,
        file_name: `session_${session.id}`,
        content: JSON.stringify(session),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    return !error;
  } catch {
    return false;
  }
}

export async function getLastSessionId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('content')
      .eq('id', makeId(userId, 'last_session'))
      .single();
    
    if (error || !data?.content) return null;
    return data.content;
  } catch {
    return null;
  }
}

export async function saveLastSessionId(userId: string, sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        id: makeId(userId, 'last_session'),
        user_id: userId,
        file_name: 'last_session',
        content: sessionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    return !error;
  } catch {
    return false;
  }
}

export async function createNewSession(userId: string): Promise<ChatSession> {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: 'New Chat',
    preview: '',
    timestamp: new Date().toISOString(),
    messages: [],
  };
  
  await saveSession(userId, session);
  await saveLastSessionId(userId, session.id);
  
  return session;
}
