"use client";

import { createContext, useContext, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

const ListTypeCtx = createContext<"ul" | "ol">("ul");

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/60">
        <span className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">
          {language || "texto"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3 inline mr-1" />Copiado!</>
          ) : (
            <><Copy className="w-3 h-3 inline mr-1" />Copiar</>
          )}
        </button>
      </div>
      <pre className="px-4 py-3.5 bg-muted/50 overflow-x-auto text-[12.5px] leading-relaxed">
        <code className="text-emerald-600 dark:text-emerald-300/85 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children }) {
          return (
            <p className="text-foreground/85 text-sm leading-relaxed mb-2.5 last:mb-0">
              {children}
            </p>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-foreground">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-foreground/70">{children}</em>;
        },
        h1({ children }) {
          return (
            <h1 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0 pb-1.5 border-b border-border/60">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-sm font-bold text-foreground/90 mt-3.5 mb-1.5 first:mt-0">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-sm font-semibold text-foreground/80 mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          );
        },
        ul({ children }) {
          return (
            <ListTypeCtx.Provider value="ul">
              <ul className="my-2 space-y-1">{children}</ul>
            </ListTypeCtx.Provider>
          );
        },
        ol({ children }) {
          return (
            <ListTypeCtx.Provider value="ol">
              <ol className="my-2 space-y-1 pl-5 list-decimal marker:text-blue-400/60">
                {children}
              </ol>
            </ListTypeCtx.Provider>
          );
        },
        li({ children }) {
          const listType = useContext(ListTypeCtx);
          return (
            <li className="text-foreground/80 text-sm flex gap-2 items-start">
              {listType === "ul" && (
                <span className="mt-[0.42em] w-1.5 h-1.5 rounded-full bg-blue-400/50 flex-none shrink-0" />
              )}
              <span className="flex-1 [&>p]:mb-0 [&>p]:inline">{children}</span>
            </li>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-blue-400/40 pl-4 py-0.5 my-3 bg-blue-500/[0.04] rounded-r-xl">
              <div className="text-muted-foreground italic text-sm [&>p]:mb-0">{children}</div>
            </blockquote>
          );
        },
        hr() {
          return <hr className="border-border/60 my-4" />;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/40 transition-colors"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-xl border border-border/60">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-muted/50">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody>{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="border-b border-border/40 last:border-0">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-2.5 text-foreground/80 text-sm">{children}</td>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children }) {
          const lang = /language-(\w+)/.exec(className || "")?.[1];
          const content = String(children);
          if (className || content.includes("\n")) {
            return <CodeBlock language={lang || ""} code={content.trimEnd()} />;
          }
          return (
            <code className="px-1.5 py-0.5 rounded-md bg-muted/50 text-blue-500 dark:text-blue-300 text-[11.5px] font-mono font-medium">
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
