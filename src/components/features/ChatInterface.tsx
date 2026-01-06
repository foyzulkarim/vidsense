'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import Button from '@/components/ui/Button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatInterfaceProps {
  videoId: string;
  className?: string;
}

export default function ChatInterface({ videoId, className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`/api/videos/${videoId}/chat/history`);
        const data = await response.json();

        if (response.ok && data.data) {
          setMessages(data.data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsHistoryLoaded(true);
      }
    }

    loadHistory();
  }, [videoId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save to localStorage for session persistence
  useEffect(() => {
    if (isHistoryLoaded && messages.length > 0) {
      const sessions = JSON.parse(localStorage.getItem('vidsense_sessions') || '{}');
      sessions[videoId] = {
        videoId,
        lastAccessed: new Date().toISOString(),
        messageCount: messages.length,
      };
      localStorage.setItem('vidsense_sessions', JSON.stringify(sessions));
    }
  }, [videoId, messages, isHistoryLoaded]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const message = inputValue.trim();
      if (!message || isLoading) return;

      setInputValue('');
      setError(null);
      setIsLoading(true);

      // Optimistically add user message
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        const response = await fetch(`/api/videos/${videoId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Add AI response
        const assistantMessage: Message = {
          id: data.data.messageId,
          role: 'assistant',
          content: data.data.response,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          // Replace temp message with real one and add response
          const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
          return [
            ...withoutTemp,
            { ...tempUserMessage, id: `user-${Date.now()}` },
            assistantMessage,
          ];
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [inputValue, isLoading, videoId]
  );

  const handleClearHistory = useCallback(async () => {
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      await fetch(`/api/videos/${videoId}/chat/history`, { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [videoId]);

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Ask Questions About This Video
        </h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">
              Ask anything about what happened in this video
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about this video..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button type="submit" isLoading={isLoading} disabled={!inputValue.trim()}>
            Send
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ask questions like &quot;What happened at the beginning?&quot; or &quot;Did anyone touch the package?&quot;
        </p>
      </form>
    </div>
  );
}
