"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { AryaAvatar } from "./AryaAvatar";
import { notifyCreditsUpdated } from "@/lib/hooks/useSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AryaChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Arya, your AI BDR. Ask me anything about your campaigns, leads, or outreach strategy." },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg].slice(-10);
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/arya/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history: updated }),
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
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#6C47FF] text-white shadow-lg hover:bg-[#5A38E0] transition-colors flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#6C47FF] text-white">
            <AryaAvatar size="sm" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Arya</p>
              <p className="text-xs text-violet-200">AI BDR Assistant</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Arya anything..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-[#6C47FF] px-3 py-2 text-white disabled:opacity-50 hover:bg-[#5A38E0] transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
