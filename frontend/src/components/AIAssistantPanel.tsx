import React, { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const CONTEXT_TYPES = [
  { value: 'engineering_assistant', label: 'General Engineering' },
  { value: 'code_compliance', label: 'Code Compliance' },
  { value: 'design_generation', label: 'Design Generation' },
  { value: 'natural_language_query', label: 'Data Query' },
];

interface Props {
  onClose: () => void;
}

export const AIAssistantPanel: React.FC<Props> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Kia ora! I\'m your TPT engineering assistant. Ask me about cost estimates, compliance requirements, design options, or project data.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState('engineering_assistant');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setLoading(true);

    try {
      const result = await api.aiAssist(prompt, contextType);
      setMessages(prev => [...prev, { role: 'assistant', text: result }]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${detail}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">AI Engineering Assistant</h3>
          <p className="text-xs text-gray-500">Ctrl+Shift+A to toggle</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-500 hover:bg-gray-200"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Context selector */}
      <div className="px-4 py-2 border-b border-gray-100">
        <select
          value={contextType}
          onChange={e => setContextType(e.target.value)}
          className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CONTEXT_TYPES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about engineering, compliance, costs…"
            rows={2}
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 self-end"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};
