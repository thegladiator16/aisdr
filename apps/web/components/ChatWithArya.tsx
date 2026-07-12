"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { notifyCreditsUpdated } from "@/lib/hooks/useSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm Arya, your AI BDR. Ask me anything about your campaigns, leads, or outreach strategy.",
};

const SUGGESTIONS = [
  "How's my pipeline performing?",
  "Draft a cold outreach email",
  "Suggest audience personas",
];

export function ChatWithArya({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSend = useCallback(
    async (override?: string) => {
      const value = (override ?? input).trim();
      if (!value || loading) return;
      const userMsg: Message = { role: "user", content: value };
      const updated = [...messages, userMsg].slice(-10);
      setMessages(updated);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/arya/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: value, history: updated }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.reply ?? "Sorry, I couldn't process that right now.",
          },
        ]);
        if (data.creditsConsumed) notifyCreditsUpdated();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header — gradient matching the floating widget */}
      <div
        className="relative flex items-center gap-3 overflow-hidden px-4 py-3 text-white shrink-0"
        style={{
          background:
            "linear-gradient(135deg, #6C47FF 0%, #8B5CF6 55%, #A855F7 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-8 left-10 h-20 w-20 rounded-full bg-pink-300/20 blur-2xl"
        />
        <div className="relative">
          <AryaAvatar size="sm" />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center"
          >
            <span className="arya-breathe absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white/80 bg-emerald-500" />
          </span>
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Arya</p>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
              BETA
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-violet-100">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            AI BDR Assistant · Online
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="relative rounded-lg p-1.5 transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-white via-white to-violet-50/40 p-4"
      >
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        {showSuggestions && (
          <div className="pt-3">
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Try asking
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="arya-msg-in group flex w-full items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md"
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400 transition-colors group-hover:text-violet-600" />
                  <span className="flex-1">{s}</span>
                  <span className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500">
                    &rsaquo;
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Arya anything…"
              className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition-all enabled:hover:scale-105 enabled:hover:shadow-lg enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            style={{
              background:
                "linear-gradient(135deg, #6C47FF 0%, #8B5CF6 100%)",
            }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Enter to send · Esc to close
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`arya-msg-in flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {isUser ? (
        <div
          className="max-w-[82%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed text-white shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, #6C47FF 0%, #8B5CF6 100%)",
          }}
        >
          {message.content}
        </div>
      ) : (
        <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-violet-100 bg-white px-3.5 py-2 text-sm leading-relaxed text-gray-800 shadow-sm">
          {message.content}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="arya-msg-in flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-violet-100 bg-white px-3.5 py-2.5 shadow-sm">
        <span
          className="arya-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="arya-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="arya-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}
