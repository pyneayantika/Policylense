"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { usePolicies } from "@/context/PolicyContext";
import { askPolicy } from "@/lib/api";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Send, Sparkles, Bot, MessageCircle } from "lucide-react";

const SUGGESTED_CHIPS = [
  "What are the major gaps in my coverage?",
  "Explain what co-pay and sub-limits mean",
  "Is my life cover adequate for my family?",
  "What happens during the waiting period?",
  "How does cashless vs reimbursement work?",
];

export default function ChatPage() {
  const router = useRouter();
  const { family, isSetupComplete, loading } = useFamily();
  const { policies } = usePolicies();
  const completedCount = policies.filter((p) => p.ingestion_status === "completed").length;

  const welcomeMessage = useMemo<ChatMessageType>(() => ({
    role: "assistant",
    content: completedCount > 0
      ? `I've analyzed ${completedCount} ${completedCount === 1 ? "policy" : "policies"} so far. How may I help you? You can ask me anything about your coverage, gaps, terms, or financial implications.`
      : "No policies have been analyzed yet. Upload your insurance PDFs first, then come back to ask questions about your coverage.",
    confidence: "high" as const,
    evidence: [],
  }), [completedCount]);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([welcomeMessage]);
  }, [welcomeMessage]);

  useEffect(() => {
    if (!loading && !isSetupComplete && !family) {
      router.replace("/");
    }
  }, [loading, isSetupComplete, family, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || !family) return;

    const userMsg: ChatMessageType = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setBusy(true);

    try {
      const res = await askPolicy(family.id, text);
      const assistantMsg: ChatMessageType = {
        role: "assistant",
        content: res.answer,
        evidence: res.evidence,
        confidence: res.confidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: ChatMessageType = {
        role: "assistant",
        content: "I'm unable to reach the analysis engine right now. Please try again in a moment.",
        confidence: "low",
        evidence: [],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5 flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-zinc-800 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-brand text-white shadow-sm">
              <MessageCircle size={16} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
              Ask PolicyLens
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#1a6b5a] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
              <Sparkles size={10} /> AI-Powered
            </span>
          </div>
          <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1 ml-[42px]">
            Grounded in your uploaded policy clauses · Answers cite specific section numbers
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, idx) => (
          <ChatMessage key={idx} message={m} />
        ))}

        {busy && (
          <div className="flex items-center gap-2.5 text-xs font-medium text-stone-500 dark:text-zinc-400 animate-pulse card-elevated p-3.5 w-fit">
            <Bot size={16} className="text-[#1a6b5a] animate-spin" />
            <span>PolicyLens is retrieving relevant policy clauses...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      <div className="shrink-0 space-y-2 pt-2 border-t border-stone-200/60 dark:border-zinc-800">
        <span className="text-[10px] font-semibold text-stone-400 dark:text-zinc-600 uppercase tracking-wider">
          Suggested:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => handleSend(chip)}
              className="rounded-full border border-emerald-200/60 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-1.5 text-xs font-medium text-[#1a6b5a] dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 hover:border-emerald-300 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2.5 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your policies..."
          className="flex-1 rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-3.5 text-sm dark:text-zinc-200 focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 shadow-sm placeholder:text-stone-400 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-white shadow-md shadow-emerald-900/20 hover:shadow-lg disabled:opacity-50 transition-all shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
