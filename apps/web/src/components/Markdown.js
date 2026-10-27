import ReactMarkdown from 'react-markdown';

// react-markdown does not render raw HTML, so CMS text cannot inject markup.
export default function Markdown({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`prose ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target={/^https?:/.test(href || '') ? '_blank' : undefined} rel="noopener noreferrer">{c}</a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
