"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Maximize2, Sparkles, Target, BarChart2, Mail } from "lucide-react";
import { notifyCreditsUpdated } from "@/lib/hooks/useSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: Target, text: "Suggest audience personas for my business" },
  { icon: BarChart2, text: "Compare performance across my campaigns" },
  { icon: Mail, text: "Check my mailbox deliverability" },
];

export function ChatWithArya({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const updated = [...messages, userMsg].slice(-10);
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/arya/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: updated }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Sorry, I couldn't process that right now." },
      ]);
      if (data.creditsConsumed) notifyCreditsUpdated();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <div className="h-7 w-7 rounded-full bg-[#6C47FF] flex items-center justify-center">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <span className="font-semibold text-sm text-gray-900">Arya</span>
        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
          BETA
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Online
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Send a message to start this chat.
            </p>
            <div className="mt-6 w-full space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <s.icon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="flex-1">{s.text}</span>
                  <span className="text-gray-300">&rsaquo;</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-xl px-3 py-2 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-[#6C47FF] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-400">
                  Arya is thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send Arya a message or type / for commands..."
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-[#6C47FF] p-1.5 text-white disabled:opacity-40 hover:bg-[#5A38E0] transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          / for commands &middot; Enter to send &middot; Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
