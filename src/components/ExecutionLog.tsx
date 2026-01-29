import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  text: string;
  type: 'action' | 'ai_comment' | 'error' | 'success';
  timestamp: Date;
}

interface ExecutionLogProps {
  entries: LogEntry[];
  isWorking: boolean;
  onStop?: () => void;
}

export const ExecutionLog = ({ entries, isWorking, onStop }: ExecutionLogProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  if (!isWorking && entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 max-w-xl"
    >
      {isWorking && (
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm font-medium text-gray-600">Working...</span>
          {onStop && (
            <button
              onClick={onStop}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Stop
            </button>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="space-y-1 max-h-64 overflow-y-auto"
      >
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "text-sm font-mono",
                entry.type === 'action' && "text-gray-500",
                entry.type === 'ai_comment' && "text-blue-600 italic",
                entry.type === 'error' && "text-red-500",
                entry.type === 'success' && "text-green-600"
              )}
            >
              {entry.type === 'ai_comment' ? (
                <span>AI: {entry.text}</span>
              ) : (
                <span>{entry.text}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ExecutionLog;
