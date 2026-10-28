"use client";

import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  unverified?: boolean;
  error?: boolean;
}

const QUICK_PROMPTS = [
  "What products does Amros Beauty sell?",
  "What is the price of the KMG Face Cream?",
  "What are the ingredient highlights?",
  "What's the difference between the Vitamin C Serum and the Gluta Bright Serum?",
  "Is the Gluta Night Cream suitable for dry or sensitive skin?",
  "Can I buy the Vitamin C + Glutathione Injection to use at home?",
  "How can I contact the brand?",
];

const MAX_CHARS = 500;

export function ChatWidget({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const welcome = `Hi, I'm the ${brandName} Assistant — an automated chatbot, not a human. I can only help with ${brandName}: our skincare range (creams, serums, supplements and injectables), ingredient highlights, pricing, skin-type positioning, our store location, shipping, returns and customer support. I'm not a dermatologist and I can't give medical, legal or personal advice. What would you like to know about ${brandName}?`;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (text: string, retryOfId?: number) => {
      const question = text.trim().slice(0, MAX_CHARS);
      if (!question || pending) return;
      const history = messages
        .filter((msg) => !msg.error && msg.id !== retryOfId)
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => {
        const base = retryOfId ? prev.filter((msg) => msg.id !== retryOfId) : prev;
        return retryOfId ? base : [...base, { id: nextId.current++, role: "user", content: question }];
      });
      setInput("");
      setPending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, history }),
        });
        const data = (await res.json().catch(() => null)) as { answer?: string; unverified?: boolean; error?: string } | null;
        if (!res.ok || !data?.answer) {
          throw new Error(data?.error ?? "The assistant is unavailable right now.");
        }
        setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", content: data.answer!, unverified: data.unverified }]);
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : "The assistant is unavailable right now.";
        setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", content: message, error: true }]);
      } finally {
        setPending(false);
      }
    },
    [messages, pending],
  );

  const lastUserMessage = [...messages].reverse().find((msg) => msg.role === "user");

  return (
    <>
      <AnimatePresence>
        {!open && (
          <m.button
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Open the ${brandName} Assistant chat`}
            className="fixed bottom-5 right-4 z-40 flex items-center gap-3 rounded-full bg-ink py-3 pl-3 pr-5 text-milk shadow-lift transition-colors hover:bg-[#3d3430] sm:bottom-6 sm:right-6"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-blush via-milk to-citrus-soft text-ink">
              <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9z" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold">Ask our assistant</span>
          </m.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <m.section
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            className="fixed inset-x-2 bottom-2 z-50 flex max-h-[min(42rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-lg border border-line bg-milk shadow-lift sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[25rem]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between gap-3 border-b hairline bg-milk-glow px-5 py-4">
              <div>
                <h2 id={titleId} className="font-display text-xl text-ink">
                  {brandName} Assistant
                </h2>
                <p className="text-xs text-ink-muted">Product &amp; store information · Not medical advice</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => launcherRef.current?.focus(), 50);
                }}
                className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-pearl"
                aria-label="Close chat"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite" aria-relevant="additions" aria-busy={pending}>
              <Bubble role="assistant">{welcome}</Bubble>
              {messages.length === 0 && (
                <div>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Suggested questions</p>
                  <ul className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <li key={prompt}>
                        <button
                          type="button"
                          onClick={() => send(prompt)}
                          className="rounded-full border border-line bg-ivory px-3.5 py-2 text-left text-[0.8rem] font-medium text-ink-soft transition-colors hover:border-blush-deep/50 hover:bg-blush/30 hover:text-ink"
                        >
                          {prompt}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {messages.map((msg) => (
                <Bubble key={msg.id} role={msg.role} error={msg.error} unverified={msg.unverified}>
                  {msg.content}
                  {msg.error && lastUserMessage && (
                    <button
                      type="button"
                      onClick={() => send(lastUserMessage.content, msg.id)}
                      className="mt-2 block text-xs font-semibold text-danger underline underline-offset-4"
                    >
                      Try again
                    </button>
                  )}
                </Bubble>
              ))}
              {pending && (
                <div className="flex items-center gap-2 px-1 text-xs text-ink-muted" role="status">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </span>
                  Assistant is typing…
                </div>
              )}
            </div>

            <form
              className="border-t hairline p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <label htmlFor={`${titleId}-input`} className="sr-only">
                Your question
              </label>
              <div className="flex items-end gap-2 rounded-md border border-line bg-ivory p-1.5 focus-within:border-ink/50">
                <textarea
                  ref={inputRef}
                  id={`${titleId}-input`}
                  rows={1}
                  value={input}
                  maxLength={MAX_CHARS}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask about KMG, ingredients, price…"
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-ink-muted/80"
                />
                <button
                  type="submit"
                  disabled={pending || !input.trim()}
                  className="grid size-10 shrink-0 place-items-center rounded-md bg-ink text-milk transition-opacity disabled:opacity-40"
                  aria-label="Send question"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
              <p className="mt-1.5 px-1 text-right text-[0.7rem] text-ink-muted" aria-live="off">
                {input.length}/{MAX_CHARS}
              </p>
            </form>
          </m.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  role,
  children,
  error,
  unverified,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  error?: boolean;
  unverified?: boolean;
}) {
  const isUser = role === "user";
  return (
    <m.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className={`max-w-[88%] whitespace-pre-line rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-xs bg-ink text-milk"
            : error
              ? "rounded-bl-xs border border-danger/30 bg-danger-soft text-ink"
              : "rounded-bl-xs border border-line bg-ivory text-ink"
        }`}
      >
        <span className="sr-only">{isUser ? "You said: " : "Assistant: "}</span>
        {unverified && !error && (
          <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[0.68rem] font-semibold text-warning">
            Not confirmed
          </span>
        )}
        {unverified && !error && <br />}
        {children}
      </div>
    </m.div>
  );
}
