import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { type Components } from "react-markdown"

interface MarkdownRendererProps {
  content: string
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "")
    const isBlock = String(children).includes("\n")

    if (isBlock) {
      return (
        <div className="relative my-2 min-w-0">
          {match && (
            <span className="absolute right-2 top-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {match[1]}
            </span>
          )}
          <pre className="overflow-x-auto rounded-md bg-[#1a1a2e] p-3 text-sm leading-relaxed">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      )
    }

    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-primary overflow-wrap-anywhere"
        {...props}
      >
        {children}
      </code>
    )
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>
  },
  em({ children }) {
    return <em className="italic">{children}</em>
  },
  ul({ children }) {
    return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-3 text-lg font-bold text-foreground">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 text-base font-bold text-foreground">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="mb-1 mt-2 text-sm font-bold text-foreground">{children}</h3>
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
        {children}
      </blockquote>
    )
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {children}
      </a>
    )
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="border-b border-border">{children}</thead>
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>
  },
  tr({ children }) {
    return <tr className="border-b border-border/50">{children}</tr>
  },
  th({ children }) {
    return <th className="px-2 py-1 text-left font-semibold">{children}</th>
  },
  td({ children }) {
    return <td className="px-2 py-1">{children}</td>
  },
  hr() {
    return <hr className="my-3 border-border" />
  },
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
