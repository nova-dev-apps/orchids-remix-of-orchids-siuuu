import { getGoogleTokens, refreshGoogleToken } from '../googleAuth';

export interface CloudAutomationResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export type GoogleService = 
  | 'gmail' 
  | 'drive' 
  | 'calendar' 
  | 'contacts' 
  | 'docs' 
  | 'sheets' 
  | 'slides' 
  | 'tasks';

export interface CloudCommand {
  service: GoogleService;
  action: string;
  params: Record<string, any>;
}

const SERVICE_KEYWORDS: Record<GoogleService, string[]> = {
  gmail: ['email', 'mail', 'gmail', 'send email', 'inbox', 'compose', 'reply', 'forward', 'draft'],
  drive: ['drive', 'file', 'folder', 'upload', 'download', 'google drive', 'share file', 'storage'],
  calendar: ['calendar', 'event', 'meeting', 'schedule', 'appointment', 'reminder', 'google calendar'],
  contacts: ['contact', 'contacts', 'phone number', 'address book', 'people'],
  docs: ['document', 'google doc', 'docs', 'write document', 'create document'],
  sheets: ['spreadsheet', 'sheet', 'google sheets', 'excel', 'table', 'cells', 'rows', 'columns'],
  slides: ['presentation', 'slides', 'google slides', 'powerpoint', 'slideshow'],
  tasks: ['task', 'tasks', 'todo', 'to-do', 'checklist', 'google tasks']
};

export function detectCloudService(text: string): GoogleService | null {
  const lowerText = text.toLowerCase();
  
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return service as GoogleService;
      }
    }
  }
  
  return null;
}

export function isCloudAutomationRequest(text: string): boolean {
  const service = detectCloudService(text);
  return service !== null;
}

export function shouldUseCloudAutomation(text: string): { useCloud: boolean; service: GoogleService | null } {
  const service = detectCloudService(text);
  return {
    useCloud: service !== null,
    service
  };
}

async function getValidToken(email: string): Promise<string | null> {
  const tokens = await getGoogleTokens(email);
  if (!tokens?.accessToken) {
    return null;
  }
  
  return tokens.accessToken;
}

async function refreshAndGetToken(email: string): Promise<string | null> {
  return await refreshGoogleToken(email);
}

export class CloudAutomationService {
  private userEmail: string;
  
  constructor(userEmail: string) {
    this.userEmail = userEmail;
  }

  async execute(command: CloudCommand): Promise<CloudAutomationResult> {
    let token = await getValidToken(this.userEmail);
    
    if (!token) {
      token = await refreshAndGetToken(this.userEmail);
      if (!token) {
        return {
          success: false,
          error: 'No valid Google token found. Please re-authenticate with Google.'
        };
      }
    }

    try {
      switch (command.service) {
        case 'gmail':
          return await this.executeGmailAction(token, command.action, command.params);
        case 'drive':
          return await this.executeDriveAction(token, command.action, command.params);
        case 'calendar':
          return await this.executeCalendarAction(token, command.action, command.params);
        case 'contacts':
          return await this.executeContactsAction(token, command.action, command.params);
        case 'docs':
          return await this.executeDocsAction(token, command.action, command.params);
        case 'sheets':
          return await this.executeSheetsAction(token, command.action, command.params);
        case 'slides':
          return await this.executeSlidesAction(token, command.action, command.params);
        case 'tasks':
          return await this.executeTasksAction(token, command.action, command.params);
        default:
          return { success: false, error: `Unknown service: ${command.service}` };
      }
    } catch (error: any) {
      if (error.status === 401) {
        token = await refreshAndGetToken(this.userEmail);
        if (token) {
          return this.execute(command);
        }
      }
      return { success: false, error: error.message || 'Cloud automation failed' };
    }
  }

  private async executeGmailAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
    
    switch (action) {
      case 'sendEmail': {
        const { to, subject, body, cc, bcc } = params;
        
        const headers = [
          `To: ${to}`,
          `Subject: ${subject}`,
          cc ? `Cc: ${cc}` : '',
          bcc ? `Bcc: ${bcc}` : '',
          'Content-Type: text/html; charset=utf-8',
          '',
          body
        ].filter(Boolean).join('\r\n');
        
        const encodedMessage = btoa(unescape(encodeURIComponent(headers)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        const response = await fetch(`${baseUrl}/messages/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedMessage })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to send email');
        }
        
        return { success: true, message: `Email sent to ${to}` };
      }
      
      case 'listEmails': {
        const { maxResults = 10, query } = params;
        const queryParams = new URLSearchParams({ maxResults: String(maxResults) });
        if (query) queryParams.set('q', query);
        
        const response = await fetch(`${baseUrl}/messages?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list emails');
        const data = await response.json();
        return { success: true, data: data.messages || [] };
      }
      
      case 'readEmail': {
        const { messageId } = params;
        const response = await fetch(`${baseUrl}/messages/${messageId}?format=full`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to read email');
        const data = await response.json();
        return { success: true, data };
      }
      
      case 'createDraft': {
        const { to, subject, body } = params;
        const headers = [
          `To: ${to}`,
          `Subject: ${subject}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          body
        ].join('\r\n');
        
        const encodedMessage = btoa(unescape(encodeURIComponent(headers)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        const response = await fetch(`${baseUrl}/drafts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: { raw: encodedMessage } })
        });
        
        if (!response.ok) throw new Error('Failed to create draft');
        return { success: true, message: 'Draft created' };
      }
      
      case 'deleteEmail': {
        const { messageId } = params;
        const response = await fetch(`${baseUrl}/messages/${messageId}/trash`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete email');
        return { success: true, message: 'Email moved to trash' };
      }
      
      default:
        return { success: false, error: `Unknown Gmail action: ${action}` };
    }
  }

  private async executeDriveAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://www.googleapis.com/drive/v3';
    
    switch (action) {
      case 'listFiles': {
        const { maxResults = 10, query } = params;
        const queryParams = new URLSearchParams({ pageSize: String(maxResults) });
        if (query) queryParams.set('q', query);
        queryParams.set('fields', 'files(id,name,mimeType,createdTime,modifiedTime,size)');
        
        const response = await fetch(`${baseUrl}/files?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list files');
        const data = await response.json();
        return { success: true, data: data.files || [] };
      }
      
      case 'createFolder': {
        const { name, parentId } = params;
        const metadata: any = {
          name,
          mimeType: 'application/vnd.google-apps.folder'
        };
        if (parentId) metadata.parents = [parentId];
        
        const response = await fetch(`${baseUrl}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        });
        
        if (!response.ok) throw new Error('Failed to create folder');
        const data = await response.json();
        return { success: true, message: `Folder "${name}" created`, data };
      }
      
      case 'deleteFile': {
        const { fileId } = params;
        const response = await fetch(`${baseUrl}/files/${fileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete file');
        return { success: true, message: 'File deleted' };
      }
      
      case 'shareFile': {
        const { fileId, email, role = 'reader' } = params;
        const response = await fetch(`${baseUrl}/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'user',
            role,
            emailAddress: email
          })
        });
        
        if (!response.ok) throw new Error('Failed to share file');
        return { success: true, message: `File shared with ${email}` };
      }
      
      default:
        return { success: false, error: `Unknown Drive action: ${action}` };
    }
  }

  private async executeCalendarAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://www.googleapis.com/calendar/v3';
    
    switch (action) {
      case 'listEvents': {
        const { maxResults = 10, timeMin, timeMax } = params;
        const queryParams = new URLSearchParams({
          maxResults: String(maxResults),
          singleEvents: 'true',
          orderBy: 'startTime'
        });
        if (timeMin) queryParams.set('timeMin', timeMin);
        if (timeMax) queryParams.set('timeMax', timeMax);
        
        const response = await fetch(`${baseUrl}/calendars/primary/events?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list events');
        const data = await response.json();
        return { success: true, data: data.items || [] };
      }
      
      case 'createEvent': {
        const { summary, description, start, end, attendees, location } = params;
        const event: any = {
          summary,
          description,
          location,
          start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: { dateTime: end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
        };
        if (attendees) {
          event.attendees = attendees.map((email: string) => ({ email }));
        }
        
        const response = await fetch(`${baseUrl}/calendars/primary/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
        
        if (!response.ok) throw new Error('Failed to create event');
        const data = await response.json();
        return { success: true, message: `Event "${summary}" created`, data };
      }
      
      case 'deleteEvent': {
        const { eventId } = params;
        const response = await fetch(`${baseUrl}/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
        return { success: true, message: 'Event deleted' };
      }
      
      default:
        return { success: false, error: `Unknown Calendar action: ${action}` };
    }
  }

  private async executeContactsAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://people.googleapis.com/v1';
    
    switch (action) {
      case 'listContacts': {
        const { maxResults = 10 } = params;
        const response = await fetch(`${baseUrl}/people/me/connections?pageSize=${maxResults}&personFields=names,emailAddresses,phoneNumbers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list contacts');
        const data = await response.json();
        return { success: true, data: data.connections || [] };
      }
      
      case 'createContact': {
        const { name, email, phone } = params;
        const person: any = {
          names: [{ givenName: name }]
        };
        if (email) person.emailAddresses = [{ value: email }];
        if (phone) person.phoneNumbers = [{ value: phone }];
        
        const response = await fetch(`${baseUrl}/people:createContact`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(person)
        });
        
        if (!response.ok) throw new Error('Failed to create contact');
        return { success: true, message: `Contact "${name}" created` };
      }
      
      default:
        return { success: false, error: `Unknown Contacts action: ${action}` };
    }
  }

  private async executeDocsAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://docs.googleapis.com/v1';
    
    switch (action) {
      case 'createDocument': {
        const { title } = params;
        const response = await fetch(`${baseUrl}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });
        
        if (!response.ok) throw new Error('Failed to create document');
        const data = await response.json();
        return { success: true, message: `Document "${title}" created`, data };
      }
      
      case 'getDocument': {
        const { documentId } = params;
        const response = await fetch(`${baseUrl}/documents/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to get document');
        const data = await response.json();
        return { success: true, data };
      }
      
      case 'updateDocument': {
        const { documentId, requests } = params;
        const response = await fetch(`${baseUrl}/documents/${documentId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        });
        
        if (!response.ok) throw new Error('Failed to update document');
        return { success: true, message: 'Document updated' };
      }
      
      default:
        return { success: false, error: `Unknown Docs action: ${action}` };
    }
  }

  private async executeSheetsAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://sheets.googleapis.com/v4';
    
    switch (action) {
      case 'createSpreadsheet': {
        const { title } = params;
        const response = await fetch(`${baseUrl}/spreadsheets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ properties: { title } })
        });
        
        if (!response.ok) throw new Error('Failed to create spreadsheet');
        const data = await response.json();
        return { success: true, message: `Spreadsheet "${title}" created`, data };
      }
      
      case 'getSpreadsheet': {
        const { spreadsheetId } = params;
        const response = await fetch(`${baseUrl}/spreadsheets/${spreadsheetId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to get spreadsheet');
        const data = await response.json();
        return { success: true, data };
      }
      
      case 'updateCells': {
        const { spreadsheetId, range, values } = params;
        const response = await fetch(`${baseUrl}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
        
        if (!response.ok) throw new Error('Failed to update cells');
        return { success: true, message: 'Cells updated' };
      }
      
      case 'readCells': {
        const { spreadsheetId, range } = params;
        const response = await fetch(`${baseUrl}/spreadsheets/${spreadsheetId}/values/${range}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to read cells');
        const data = await response.json();
        return { success: true, data: data.values || [] };
      }
      
      default:
        return { success: false, error: `Unknown Sheets action: ${action}` };
    }
  }

  private async executeSlidesAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://slides.googleapis.com/v1';
    
    switch (action) {
      case 'createPresentation': {
        const { title } = params;
        const response = await fetch(`${baseUrl}/presentations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });
        
        if (!response.ok) throw new Error('Failed to create presentation');
        const data = await response.json();
        return { success: true, message: `Presentation "${title}" created`, data };
      }
      
      case 'getPresentation': {
        const { presentationId } = params;
        const response = await fetch(`${baseUrl}/presentations/${presentationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to get presentation');
        const data = await response.json();
        return { success: true, data };
      }
      
      default:
        return { success: false, error: `Unknown Slides action: ${action}` };
    }
  }

  private async executeTasksAction(token: string, action: string, params: Record<string, any>): Promise<CloudAutomationResult> {
    const baseUrl = 'https://tasks.googleapis.com/tasks/v1';
    
    switch (action) {
      case 'listTaskLists': {
        const response = await fetch(`${baseUrl}/users/@me/lists`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list task lists');
        const data = await response.json();
        return { success: true, data: data.items || [] };
      }
      
      case 'listTasks': {
        const { taskListId = '@default' } = params;
        const response = await fetch(`${baseUrl}/lists/${taskListId}/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list tasks');
        const data = await response.json();
        return { success: true, data: data.items || [] };
      }
      
      case 'createTask': {
        const { taskListId = '@default', title, notes, due } = params;
        const task: any = { title };
        if (notes) task.notes = notes;
        if (due) task.due = due;
        
        const response = await fetch(`${baseUrl}/lists/${taskListId}/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(task)
        });
        
        if (!response.ok) throw new Error('Failed to create task');
        return { success: true, message: `Task "${title}" created` };
      }
      
      case 'completeTask': {
        const { taskListId = '@default', taskId } = params;
        const response = await fetch(`${baseUrl}/lists/${taskListId}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        });
        
        if (!response.ok) throw new Error('Failed to complete task');
        return { success: true, message: 'Task completed' };
      }
      
      case 'deleteTask': {
        const { taskListId = '@default', taskId } = params;
        const response = await fetch(`${baseUrl}/lists/${taskListId}/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        return { success: true, message: 'Task deleted' };
      }
      
      default:
        return { success: false, error: `Unknown Tasks action: ${action}` };
    }
  }
}

let cloudServiceInstance: CloudAutomationService | null = null;

export function getCloudAutomationService(userEmail: string): CloudAutomationService {
  if (!cloudServiceInstance || cloudServiceInstance['userEmail'] !== userEmail) {
    cloudServiceInstance = new CloudAutomationService(userEmail);
  }
  return cloudServiceInstance;
}

export const CLOUD_AUTOMATION_SERVICES = [
  'Gmail - Send, read, draft, delete emails',
  'Google Drive - List, create folders, share, delete files',
  'Google Calendar - Create, list, delete events',
  'Google Contacts - List, create contacts',
  'Google Docs - Create, read, update documents',
  'Google Sheets - Create, read, update spreadsheets',
  'Google Slides - Create, read presentations',
  'Google Tasks - Create, list, complete, delete tasks'
];
