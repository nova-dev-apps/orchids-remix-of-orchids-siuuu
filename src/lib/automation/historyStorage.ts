import { supabase } from '../supabase';

export interface ExecutionHistoryEntry {
  id: string;
  userEmail: string;
  planId: string;
  planTitle: string;
  status: 'success' | 'partial' | 'failed';
  tasksCompleted: number;
  totalTasks: number;
  duration: number;
  executedAt: number;
  error?: string;
}

const TABLE = 'ai_behavior_settings';

const makeId = (userEmail: string, entryId: string) => 
  `history_entry_${userEmail}_${entryId}`;

export async function loadExecutionHistory(userEmail: string): Promise<ExecutionHistoryEntry[]> {
  return historyStorage.getAllEntries(userEmail);
}

export async function saveExecutionLog(userEmail: string, log: ExecutionHistoryEntry): Promise<boolean> {
  return historyStorage.saveEntry(log);
}

export async function clearExecutionHistory(userEmail: string): Promise<boolean> {
  return historyStorage.clearHistory(userEmail);
}

export const historyStorage = {
  async saveEntry(entry: ExecutionHistoryEntry): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert({
          id: makeId(entry.userEmail, entry.id),
          user_id: entry.userEmail,
          file_name: `history_${entry.id}`,
          content: JSON.stringify(entry),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      return !error;
    } catch {
      return false;
    }
  },

  async getEntry(userEmail: string, entryId: string): Promise<ExecutionHistoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .eq('id', makeId(userEmail, entryId))
        .single();
      
      if (error || !data?.content) return null;
      return JSON.parse(data.content);
    } catch {
      return null;
    }
  },

  async getAllEntries(userEmail: string): Promise<ExecutionHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .like('id', `history_entry_${userEmail}_%`)
        .order('updated_at', { ascending: false });
      
      if (error || !data) return [];
      
      return data
        .map(row => {
          try {
            return JSON.parse(row.content);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ExecutionHistoryEntry[];
    } catch {
      return [];
    }
  },

  async deleteEntry(userEmail: string, entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', makeId(userEmail, entryId));
      
      return !error;
    } catch {
      return false;
    }
  },

  async clearHistory(userEmail: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .like('id', `history_entry_${userEmail}_%`);
      
      return !error;
    } catch {
      return false;
    }
  },

  async getRecentEntries(userEmail: string, limit: number = 10): Promise<ExecutionHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .like('id', `history_entry_${userEmail}_%`)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) return [];
      
      return data
        .map(row => {
          try {
            return JSON.parse(row.content);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ExecutionHistoryEntry[];
    } catch {
      return [];
    }
  }
};
