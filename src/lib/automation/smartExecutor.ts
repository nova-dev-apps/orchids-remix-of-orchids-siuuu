import { getAgentClient, AgentCommand, AgentResponse } from './agentClient';
import { screenshotService, CapturedScreenshot, AIVisionAnalysisConfig } from './screenshotService';

export interface ExecutionStep {
  id: string;
  action: string;
  description: string;
  params?: Record<string, unknown>;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  steps: ExecutionStep[];
}

export interface SmartExecutionCallbacks {
  onLogEntry: (text: string, type: 'action' | 'ai_comment' | 'error' | 'success') => void;
  onScreenshot?: (screenshot: CapturedScreenshot) => void;
  onPlanUpdated?: (plan: ExecutionPlan) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface AIAnalysisResult {
  success: boolean;
  observation: string;
  shouldContinue: boolean;
  suggestedCorrection?: {
    stepIndex: number;
    newStep?: ExecutionStep;
    removeStep?: boolean;
    insertAfter?: ExecutionStep;
  };
  aiComment?: string;
}

class SmartAutomationExecutor {
  private currentPlan: ExecutionPlan | null = null;
  private isRunning = false;
  private shouldStop = false;
  private aiConfig: AIVisionAnalysisConfig | null = null;
  private callbacks: SmartExecutionCallbacks | null = null;

  setAIConfig(config: AIVisionAnalysisConfig) {
    this.aiConfig = config;
  }

  async execute(plan: ExecutionPlan, callbacks: SmartExecutionCallbacks): Promise<void> {
    this.currentPlan = { ...plan, steps: [...plan.steps] };
    this.callbacks = callbacks;
    this.isRunning = true;
    this.shouldStop = false;

    const client = getAgentClient();
    let stepIndex = 0;

    callbacks.onLogEntry(`Starting: ${plan.goal}`, 'action');

    while (stepIndex < this.currentPlan.steps.length && !this.shouldStop) {
      const step = this.currentPlan.steps[stepIndex];
      
      callbacks.onLogEntry(step.description, 'action');

      let beforeScreenshot: CapturedScreenshot | null = null;
      if (this.aiConfig) {
        beforeScreenshot = await screenshotService.captureBeforeAction(
          step.action,
          step.params || {},
          plan.id
        );
        if (beforeScreenshot && callbacks.onScreenshot) {
          callbacks.onScreenshot(beforeScreenshot);
        }
      }

      const command = this.stepToCommand(step);
      const response = await client.execute(command);

      await this.delay(500);

      let afterScreenshot: CapturedScreenshot | null = null;
      if (this.aiConfig) {
        afterScreenshot = await screenshotService.captureAfterAction(
          step.action,
          step.params || {},
          plan.id,
          response.success
        );
        if (afterScreenshot && callbacks.onScreenshot) {
          callbacks.onScreenshot(afterScreenshot);
        }
      }

      if (!response.success) {
        callbacks.onLogEntry(`Failed: ${step.description} - ${response.error}`, 'error');
        
        if (this.aiConfig && afterScreenshot) {
          const analysis = await this.analyzeWithAI(
            afterScreenshot,
            step,
            stepIndex,
            'error',
            response.error
          );
          
          if (analysis.aiComment) {
            callbacks.onLogEntry(analysis.aiComment, 'ai_comment');
          }
          
          if (analysis.suggestedCorrection && analysis.shouldContinue) {
            this.applyCorrection(analysis.suggestedCorrection, stepIndex);
            callbacks.onPlanUpdated?.(this.currentPlan);
            continue;
          }
        }
        
        callbacks.onError?.(response.error || 'Unknown error');
        break;
      }

      if (this.aiConfig && afterScreenshot) {
        const analysis = await this.analyzeWithAI(
          afterScreenshot,
          step,
          stepIndex,
          'success'
        );
        
        if (analysis.aiComment) {
          callbacks.onLogEntry(analysis.aiComment, 'ai_comment');
        }
        
        if (analysis.suggestedCorrection) {
          this.applyCorrection(analysis.suggestedCorrection, stepIndex);
          callbacks.onPlanUpdated?.(this.currentPlan);
        }
      }

      stepIndex++;
    }

    if (!this.shouldStop) {
      callbacks.onLogEntry('Task completed', 'success');
      callbacks.onComplete?.();
    }

    this.isRunning = false;
  }

  stop() {
    this.shouldStop = true;
    this.isRunning = false;
  }

  private stepToCommand(step: ExecutionStep): AgentCommand {
    const params = step.params || {};
    
    switch (step.action) {
      case 'click':
        return { action: 'click', x: params.x as number, y: params.y as number };
      case 'doubleclick':
        return { action: 'doubleclick', x: params.x as number, y: params.y as number };
      case 'type':
        return { action: 'type', text: params.text as string };
      case 'hotkey':
        return { action: 'hotkey', keys: params.keys as string };
      case 'run':
        return { action: 'run', command: params.command as string };
      case 'openUrl':
        return { action: 'openUrl', url: params.url as string };
      case 'wait':
        return { action: 'wait', ms: params.ms as number || 1000 };
      default:
        return { action: step.action as AgentCommand['action'], ...params };
    }
  }

  private async analyzeWithAI(
    screenshot: CapturedScreenshot,
    step: ExecutionStep,
    stepIndex: number,
    status: 'success' | 'error',
    errorMsg?: string
  ): Promise<AIAnalysisResult> {
    if (!this.aiConfig) {
      return { success: true, observation: '', shouldContinue: true };
    }

    try {
      const prompt = `You are monitoring an automation task. 
Current step: "${step.description}"
Status: ${status}
${errorMsg ? `Error: ${errorMsg}` : ''}

Analyze the screenshot and respond with JSON:
{
  "observation": "brief description of what you see",
  "shouldContinue": true/false,
  "aiComment": "optional comment if something notable (null if nothing special)",
  "suggestedCorrection": null or { "stepIndex": N, "newStep": {...} or "removeStep": true or "insertAfter": {...} }
}

Only suggest corrections if clearly needed. Keep comments brief and helpful.`;

      const response = await fetch(this.aiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshot.base64}` } }
            ]
          }],
          max_tokens: 500
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          observation: parsed.observation || '',
          shouldContinue: parsed.shouldContinue !== false,
          aiComment: parsed.aiComment || undefined,
          suggestedCorrection: parsed.suggestedCorrection || undefined
        };
      }
    } catch (e) {
      console.error('[SmartExecutor] AI analysis error:', e);
    }

    return { success: true, observation: '', shouldContinue: status === 'success' };
  }

  private applyCorrection(
    correction: AIAnalysisResult['suggestedCorrection'],
    currentIndex: number
  ) {
    if (!correction || !this.currentPlan) return;

    const idx = correction.stepIndex ?? currentIndex;

    if (correction.removeStep) {
      this.currentPlan.steps.splice(idx, 1);
    } else if (correction.newStep) {
      this.currentPlan.steps[idx] = correction.newStep;
    } else if (correction.insertAfter) {
      this.currentPlan.steps.splice(idx + 1, 0, correction.insertAfter);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const smartExecutor = new SmartAutomationExecutor();
export default smartExecutor;
