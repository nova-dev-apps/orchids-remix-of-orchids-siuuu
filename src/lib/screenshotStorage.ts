import { supabase } from './supabase';

export interface ExecutionScreenshot {
  id: string;
  userEmail: string;
  sessionId: string;
  screenshotData: string;
  taskDescription: string;
  timestamp: number;
  executionState: 'pending' | 'running' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export class ExecutionScreenshotCapture {
  private userEmail: string;
  private sessionId: string;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(userEmail: string, sessionId: string) {
    this.userEmail = userEmail;
    this.sessionId = sessionId;
  }

  async capture(taskDescription: string, state: ExecutionScreenshot['executionState'] = 'running'): Promise<ExecutionScreenshot | null> {
    const screenshot: ExecutionScreenshot = {
      id: crypto.randomUUID(),
      userEmail: this.userEmail,
      sessionId: this.sessionId,
      screenshotData: '',
      taskDescription,
      timestamp: Date.now(),
      executionState: state,
    };
    
    const saved = await screenshotStorage.saveScreenshot(screenshot);
    return saved ? screenshot : null;
  }

  async updateState(screenshotId: string, state: ExecutionScreenshot['executionState']): Promise<boolean> {
    return screenshotStorage.updateScreenshotState(this.userEmail, screenshotId, state);
  }

  startAutoCapture(intervalMs: number, taskDescription: string): void {
    this.stopAutoCapture();
    this.intervalId = setInterval(() => {
      this.capture(taskDescription, 'running');
    }, intervalMs);
  }

  stopAutoCapture(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const TABLE = 'ai_behavior_settings';

const makeId = (userEmail: string, type: string, subId?: string) => 
  subId ? `screenshot_${type}_${userEmail}_${subId}` : `screenshot_${type}_${userEmail}`;

export const screenshotStorage = {
  async saveScreenshot(screenshot: ExecutionScreenshot): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert({
          id: makeId(screenshot.userEmail, 'item', screenshot.id),
          user_id: screenshot.userEmail,
          file_name: `screenshot_${screenshot.id}`,
          content: JSON.stringify(screenshot),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      return !error;
    } catch {
      return false;
    }
  },

  async getScreenshot(userEmail: string, screenshotId: string): Promise<ExecutionScreenshot | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .eq('id', makeId(userEmail, 'item', screenshotId))
        .single();
      
      if (error || !data?.content) return null;
      return JSON.parse(data.content);
    } catch {
      return null;
    }
  },

  async getScreenshotsBySession(userEmail: string, sessionId: string): Promise<ExecutionScreenshot[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .like('id', `screenshot_item_${userEmail}_%`)
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
        .filter((s): s is ExecutionScreenshot => s !== null && s.sessionId === sessionId);
    } catch {
      return [];
    }
  },

  async getAllScreenshots(userEmail: string): Promise<ExecutionScreenshot[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .like('id', `screenshot_item_${userEmail}_%`)
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
        .filter(Boolean) as ExecutionScreenshot[];
    } catch {
      return [];
    }
  },

  async deleteScreenshot(userEmail: string, screenshotId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', makeId(userEmail, 'item', screenshotId));
      
      return !error;
    } catch {
      return false;
    }
  },

  async updateScreenshotState(
    userEmail: string, 
    screenshotId: string, 
    state: ExecutionScreenshot['executionState']
  ): Promise<boolean> {
    try {
      const screenshot = await this.getScreenshot(userEmail, screenshotId);
      if (!screenshot) return false;
      
      screenshot.executionState = state;
      return await this.saveScreenshot(screenshot);
    } catch {
      return false;
    }
  },

  async getLatestScreenshot(userEmail: string): Promise<ExecutionScreenshot | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('content')
        .like('id', `screenshot_item_${userEmail}_%`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data?.content) return null;
      return JSON.parse(data.content);
    } catch {
      return null;
    }
  }
};
