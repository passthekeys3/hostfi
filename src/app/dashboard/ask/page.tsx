"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Sparkles, Loader2, User, Bot, AlertCircle } from "lucide-react";
import { EXAMPLE_QUESTIONS } from "@/lib/demo-query-context";
import { UpgradeGate } from "@/components/upgrade-gate";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

export default function AskPage() {
  const MAX_MESSAGES = 40; // 20 exchanges — prevent unbounded memory growth
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg].slice(-MAX_MESSAGES));
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || data.error || "Something went wrong.",
        timestamp: new Date(),
        error: !!data.error,
      };

      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_MESSAGES));
    } catch (error) {
      console.error('AI question request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Failed to reach the server. Please try again.",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion(input);
    }
  };

  return (
    <UpgradeGate feature="ask-ai">
    <div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-5rem)]">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ask AI</h1>
            <p className="text-sm text-gray-500">
              Ask anything about your properties and expenses
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-teal-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Ask About Your Finances
            </h2>
            <p className="text-sm text-gray-500 text-center max-w-md mb-8">
              Get instant answers about your property expenses, spending trends,
              and financial insights powered by AI.
            </p>

            {/* Example chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="px-3.5 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-gray-200 hover:border-teal-200 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center mt-0.5">
                    {msg.error ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Bot className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-teal-500 text-white"
                      : msg.error
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-gray-50 text-gray-800 border border-gray-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-2 ${
                      msg.role === "user"
                        ? "text-teal-100"
                        : msg.error
                          ? "text-rose-400"
                          : "text-gray-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-teal-600" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                  <span className="text-sm text-gray-500">Analyzing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 mt-3 pb-4 lg:pb-0">
        <label htmlFor="ask-ai-input" className="sr-only">Ask a question about your expenses</label>
        <div className="relative flex items-end bg-white border border-gray-200 rounded-xl shadow-sm focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <textarea
            id="ask-ai-input"
            ref={inputRef}
            value={input}
            onChange={(e) => { if (e.target.value.length <= 500) setInput(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your expenses and revenue..."
            rows={1}
            maxLength={500}
            aria-describedby="ask-ai-hint"
            className="flex-1 px-4 py-3.5 text-sm bg-transparent resize-none outline-none placeholder:text-gray-400 max-h-[120px]"
            style={{ minHeight: "48px" }}
          />
          <button
            onClick={() => askQuestion(input)}
            disabled={!input.trim() || loading}
            aria-label={loading ? "Sending..." : "Send question"}
            className="shrink-0 m-2 p-2.5 rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p id="ask-ai-hint" className="text-[10px] text-gray-400 text-center mt-2">
          AI analyzes your expense data to answer questions. Responses may not always be perfect.
        </p>
      </div>
    </div>
    </UpgradeGate>
  );
}
