## Project Summary
Nova AI is a desktop automation assistant that allows users to automate tasks on their computer through natural language. It features an AI chat interface with two modes: Chat Mode (normal conversation) and Auto Mode (computer automation).

## Tech Stack
- Language: TypeScript
- Framework: React with Vite
- UI: Tailwind CSS + shadcn/ui
- Backend: Supabase (Auth, Database, Storage)
- Payments: PayPal
- Desktop Automation: Local agent (electron/native) communicating via WebSocket

## Architecture
- `/src/pages/` - Main pages (AIChat.tsx is the core)
- `/src/components/` - UI components
- `/src/lib/automation/` - Automation engine, agent client, screenshot service
- `/src/lib/` - Utilities (supabase, storage, auth)

## User Preferences
- Auto Mode must receive screenshots as CODE/TEXT descriptions (not raw images) for better AI understanding
- Chat Mode is only for chatting - no automation features
- AI should ask for user's OS once (first time in Auto Mode) and remember it forever
- Never assume Linux - always detect/ask for the actual OS

## Project Guidelines
- Screenshots are converted to structured text descriptions (screen-state format) before being sent to the AI
- Screenshot conversion requires a vision-capable AI model (GPT-4o, Claude 3, Gemini Pro Vision, etc.)
- If screenshot conversion fails (model doesn't support vision), AI is instructed to ask user to describe their screen
- OS detection: Saved in localStorage as `nova_user_os`, persists across sessions
- The local agent can: click, type, hotkey, scroll, run commands, read/write files, take screenshots

## Common Patterns
- OS-specific commands: Windows uses `start`, `dir`, `powershell`; macOS uses `open`, `ls`; Linux uses `xdg-open`, `ls`
- Screen state context types:
  1. `[SCREEN STATE - CONVERTED FROM SCREENSHOT]` - successful vision conversion
  2. `[SCREEN STATE - CONVERSION FAILED]` - vision not supported, AI should ask user
  3. `[NO SCREENSHOT AVAILABLE]` - agent connected but no screenshot yet
  4. `[AGENT NOT CONNECTED]` - local agent not running
