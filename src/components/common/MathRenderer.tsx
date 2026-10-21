import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

/**
 * Normalizes Unicode math exponents, fractions and square roots to LaTeX before KaTeX rendering
 */
function preProcessMathText(raw: string): string {
  if (!raw) return '';

  return raw
    // Unicode fractions to LaTeX
    .replace(/½/g, '$\\frac{1}{2}$')
    .replace(/¼/g, '$\\frac{1}{4}$')
    .replace(/¾/g, '$\\frac{3}{4}$')
    .replace(/⅓/g, '$\\frac{1}{3}$')
    .replace(/⅔/g, '$\\frac{2}{3}$')
    .replace(/⅕/g, '$\\frac{1}{5}$')
    // Unicode square root followed by number or parentheses: √144 or √(25)
    .replace(/√\s*(\d+|\([^\)]+\))/g, '$\\sqrt{$1}$')
    // Unicode minus sign
    .replace(/\u2212/g, '-');
}

/**
 * Renders text containing mathematical formulas (LaTeX / equations like \frac, \sqrt, $...$, x^2),
 * HTML tags (img, sup, sub, b, i), and standard paragraphs.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  className = '',
  inline = false
}) => {
  const renderedContent = useMemo(() => {
    if (!text) return '';

    let processed = preProcessMathText(text);

    // 1. Process block math: $$ ... $$ or \[ ... \]
    processed = processed.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, g1, g2) => {
      const formula = (g1 || g2 || '').trim();
      try {
        return `<div class="katex-display my-2 overflow-x-auto py-1">${katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false
        })}</div>`;
      } catch {
        return `<span class="font-mono text-amber-700 bg-amber-50 px-1 rounded">${formula}</span>`;
      }
    });

    // 2. Process inline math: $ ... $ or \( ... \)
    processed = processed.replace(/\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, (_, g1, g2) => {
      const formula = (g1 || g2 || '').trim();
      try {
        return katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false
        });
      } catch {
        return `<span class="font-mono text-amber-700 bg-amber-50 px-1 rounded">${formula}</span>`;
      }
    });

    // 3. Process standalone LaTeX commands that might not be wrapped in $ (e.g. \frac{1}{2}, \sqrt{144})
    const standaloneLatexRegex = /(\\(?:frac|sqrt|pm|times|div|le|ge|ne|approx|sum|int|prod|alpha|beta|gamma|delta|pi|theta|Delta|in|notin|subset|cup|cap|to|implies)\b[^{$\n]*(?:\{[^{}$\n]*\})*)/g;
    processed = processed.replace(standaloneLatexRegex, (match) => {
      if (match.includes('class="katex')) return match;
      try {
        return katex.renderToString(match.trim(), {
          displayMode: false,
          throwOnError: false
        });
      } catch {
        return match;
      }
    });

    // 4. Format line breaks
    processed = processed.replace(/\n/g, '<br />');

    return processed;
  }, [text]);

  const Component = inline ? 'span' : 'div';

  return (
    <Component
      className={`math-rendered-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
};
