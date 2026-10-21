import JSZip from 'jszip';
import mammoth from 'mammoth';
import { Question, QuestionType, QuestionOption, MatchingPair } from '../types/cbt';

export interface ParseResult {
  questions: Question[];
  rawText: string;
  stats: {
    total: number;
    multiple_choice: number;
    multiple_choice_complex: number;
    matching: number;
    essay: number;
    withImages: number;
    withEquations: number;
    keysDetected: number;
    warnings: string[];
  };
}

/**
 * Normalizes common mathematical Unicode symbols to LaTeX equivalents
 */
function normalizeMathSymbols(str: string): string {
  return str
    .replace(/\u2212/g, '-') // Unicode minus sign − to ASCII -
    .replace(/[×✕✖]/g, ' \\times ')
    .replace(/[÷∕]/g, ' \\div ')
    .replace(/±/g, ' \\pm ')
    .replace(/≤/g, ' \\le ')
    .replace(/≥/g, ' \\ge ')
    .replace(/≠/g, ' \\ne ')
    .replace(/≈/g, ' \\approx ')
    .replace(/≡/g, ' \\equiv ')
    .replace(/∞/g, ' \\infty ')
    .replace(/°/g, '^\\circ ')
    .replace(/·/g, ' \\cdot ')
    .replace(/√/g, ' \\sqrt ')
    .replace(/α/g, ' \\alpha ')
    .replace(/β/g, ' \\beta ')
    .replace(/γ/g, ' \\gamma ')
    .replace(/δ/g, ' \\delta ')
    .replace(/ε/g, ' \\epsilon ')
    .replace(/θ/g, ' \\theta ')
    .replace(/λ/g, ' \\lambda ')
    .replace(/μ/g, ' \\mu ')
    .replace(/π/g, ' \\pi ')
    .replace(/ρ/g, ' \\rho ')
    .replace(/σ/g, ' \\sigma ')
    .replace(/τ/g, ' \\tau ')
    .replace(/φ/g, ' \\phi ')
    .replace(/ω/g, ' \\omega ')
    .replace(/Δ/g, ' \\Delta ')
    .replace(/Σ/g, ' \\Sigma ')
    .replace(/Ω/g, ' \\Omega ')
    .replace(/→/g, ' \\to ')
    .replace(/⇒/g, ' \\implies ')
    .replace(/↔/g, ' \\leftrightarrow ')
    .replace(/⇔/g, ' \\iff ')
    .replace(/∈/g, ' \\in ')
    .replace(/∉/g, ' \\notin ')
    .replace(/⊂/g, ' \\subset ')
    .replace(/⊆/g, ' \\subseteq ')
    .replace(/∪/g, ' \\cup ')
    .replace(/∩/g, ' \\cap ')
    .replace(/∅/g, ' \\emptyset ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recursive DOM-based OMML parser for maximum precision in browser environments
 */
function ommlDomToLatex(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeMathSymbols(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  const tag = (el.localName || el.tagName || '').toLowerCase().replace(/^m:/, '');

  switch (tag) {
    // 1. Fractions: <m:f> <m:num>...</m:num> <m:den>...</m:den> </m:f>
    case 'f': {
      let num = '';
      let den = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'num') {
          num = ommlDomToLatex(child).trim();
        } else if (cTag === 'den') {
          den = ommlDomToLatex(child).trim();
        }
      }
      return `\\frac{${num || '1'}}{${den || '1'}}`;
    }

    // 2. Radicals / Square Roots: <m:rad> (optional <m:deg>...) <m:e>...</m:e> </m:rad>
    case 'rad': {
      let deg = '';
      let expr = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'deg') {
          deg = ommlDomToLatex(child).trim();
        } else if (cTag === 'e') {
          expr = ommlDomToLatex(child).trim();
        }
      }
      if (deg) {
        return `\\sqrt[${deg}]{${expr}}`;
      }
      return `\\sqrt{${expr}}`;
    }

    // 3. Sub-Superscript: <m:sSubSup> <m:e>...</m:e> <m:sub>...</m:sub> <m:sup>...</m:sup> </m:sSubSup>
    case 'ssubsup': {
      let base = '';
      let sub = '';
      let sup = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'e') base = ommlDomToLatex(child).trim();
        else if (cTag === 'sub') sub = ommlDomToLatex(child).trim();
        else if (cTag === 'sup') sup = ommlDomToLatex(child).trim();
      }
      return `{${base}}_{${sub}}^{${sup}}`;
    }

    // 4. Superscript: <m:sSup> <m:e>...</m:e> <m:sup>...</m:sup> </m:sSup>
    case 'ssup': {
      let base = '';
      let sup = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'e') base = ommlDomToLatex(child).trim();
        else if (cTag === 'sup') sup = ommlDomToLatex(child).trim();
      }
      return `{${base}}^{${sup}}`;
    }

    // 5. Subscript: <m:sSub> <m:e>...</m:e> <m:sub>...</m:sub> </m:sSub>
    case 'ssub': {
      let base = '';
      let sub = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'e') base = ommlDomToLatex(child).trim();
        else if (cTag === 'sub') sub = ommlDomToLatex(child).trim();
      }
      return `{${base}}_{${sub}}`;
    }

    // 6. Delimiters (brackets, parentheses, braces): <m:d> <m:dPr>... <m:e>...</m:e> </m:d>
    case 'd': {
      let beg = '(';
      let end = ')';
      let expr = '';

      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'dpr') {
          const begEl = child.querySelector('begChr, [val]');
          const endEl = child.querySelector('endChr, [val]');
          if (begEl) beg = begEl.getAttribute('m:val') || begEl.getAttribute('val') || beg;
          if (endEl) end = endEl.getAttribute('m:val') || endEl.getAttribute('val') || end;
        } else if (cTag === 'e') {
          expr += ommlDomToLatex(child);
        }
      }

      const leftChar = beg === '{' ? '\\left\\{' : beg === '[' ? '\\left[' : beg === '|' ? '\\left|' : '\\left(';
      const rightChar = end === '}' ? '\\right\\}' : end === ']' ? '\\right]' : end === '|' ? '\\right|' : '\\right)';
      return `${leftChar} ${expr.trim()} ${rightChar}`;
    }

    // 7. N-ary Operators: <m:nary> (Summation, Integral, Product)
    case 'nary': {
      let op = '\\sum';
      let sub = '';
      let sup = '';
      let expr = '';

      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'narypr') {
          const chrEl = child.querySelector('chr, [val]');
          const chrVal = chrEl?.getAttribute('m:val') || chrEl?.getAttribute('val');
          if (chrVal === '∫') op = '\\int';
          else if (chrVal === '∬') op = '\\iint';
          else if (chrVal === '∭') op = '\\iiint';
          else if (chrVal === '∮') op = '\\oint';
          else if (chrVal === '∏') op = '\\prod';
          else if (chrVal === '∑') op = '\\sum';
        } else if (cTag === 'sub') {
          sub = ommlDomToLatex(child).trim();
        } else if (cTag === 'sup') {
          sup = ommlDomToLatex(child).trim();
        } else if (cTag === 'e') {
          expr = ommlDomToLatex(child).trim();
        }
      }

      let res = op;
      if (sub) res += `_{${sub}}`;
      if (sup) res += `^{${sup}}`;
      if (expr) res += ` {${expr}}`;
      return res;
    }

    // 8. Functions: <m:func> (sin, cos, tan, log, ln, lim)
    case 'func': {
      let fName = '';
      let expr = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'fname') fName = ommlDomToLatex(child).trim();
        else if (cTag === 'e') expr = ommlDomToLatex(child).trim();
      }
      const cleanFName = fName.replace(/\\/g, '');
      const validFuncs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'exp', 'arcsin', 'arccos', 'arctan'];
      const opName = validFuncs.includes(cleanFName.toLowerCase()) ? `\\${cleanFName.toLowerCase()}` : fName;
      return `${opName}(${expr})`;
    }

    // 9. Matrix: <m:m> <m:mr>... <m:e>...</m:e> </m:mr> </m:m>
    case 'm': {
      const rows: string[] = [];
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'mr') {
          const cells: string[] = [];
          for (let j = 0; j < child.childNodes.length; j++) {
            const cell = child.childNodes[j] as Element;
            const cellTag = (cell.localName || cell.tagName || '').toLowerCase().replace(/^m:/, '');
            if (cellTag === 'e') {
              cells.push(ommlDomToLatex(cell).trim());
            }
          }
          if (cells.length > 0) {
            rows.push(cells.join(' & '));
          }
        }
      }
      return `\\begin{matrix} ${rows.join(' \\\\ ')} \\end{matrix}`;
    }

    // 10. Accents (Vectors, Hats, Dots, Overlines): <m:acc>
    case 'acc': {
      let expr = '';
      let accType = '\\hat';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'accpr') {
          const chrEl = child.querySelector('chr, [val]');
          const chrVal = chrEl?.getAttribute('m:val') || chrEl?.getAttribute('val');
          if (chrVal === '→' || chrVal === '⃗') accType = '\\vec';
          else if (chrVal === '¯' || chrVal === '‾') accType = '\\bar';
          else if (chrVal === '˙') accType = '\\dot';
          else if (chrVal === '¨') accType = '\\ddot';
          else if (chrVal === '^' || chrVal === '̂') accType = '\\hat';
        } else if (cTag === 'e') {
          expr = ommlDomToLatex(child).trim();
        }
      }
      return `${accType}{${expr}}`;
    }

    // 11. Overline / Underline: <m:bar>
    case 'bar': {
      let expr = '';
      let isBottom = false;
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'barpr') {
          const posEl = child.querySelector('pos, [val]');
          if (posEl?.getAttribute('m:val') === 'bot' || posEl?.getAttribute('val') === 'bot') {
            isBottom = true;
          }
        } else if (cTag === 'e') {
          expr = ommlDomToLatex(child).trim();
        }
      }
      return isBottom ? `\\underline{${expr}}` : `\\overline{${expr}}`;
    }

    // 12. Limit Low: <m:limLow>
    case 'limlow': {
      let expr = '';
      let lim = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'e') expr = ommlDomToLatex(child).trim();
        else if (cTag === 'lim') lim = ommlDomToLatex(child).trim();
      }
      return `\\lim_{${lim}}{${expr}}`;
    }

    // 13. Boxed Formula: <m:box>
    case 'box': {
      let expr = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i] as Element;
        const cTag = (child.localName || child.tagName || '').toLowerCase().replace(/^m:/, '');
        if (cTag === 'e') expr = ommlDomToLatex(child).trim();
      }
      return `\\boxed{${expr}}`;
    }

    // 14. Math Text: <m:t>
    case 't': {
      return normalizeMathSymbols(el.textContent || '');
    }

    // Skip control / formatting tags
    case 'rpr':
    case 'ctrlpr':
    case 'fpr':
    case 'radpr':
    case 'dpr':
    case 'narypr':
    case 'mpr':
    case 'accpr':
    case 'barpr':
      return '';

    // Default: recurse through children
    default: {
      let result = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        result += ommlDomToLatex(el.childNodes[i]);
      }
      return result;
    }
  }
}

/**
 * Converts Office Math Markup Language (OMML) XML string to LaTeX equation.
 * Uses DOMParser with robust recursive traversal, with regex fallback.
 */
export function ommlToLatex(ommlXml: string): string {
  if (!ommlXml || !ommlXml.trim()) return '';

  // Try DOMParser in browser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const wrappedXml = `<root xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${ommlXml}</root>`;
      const doc = parser.parseFromString(wrappedXml, 'application/xml');
      const root = doc.documentElement;

      if (root && !root.querySelector('parsererror')) {
        const latex = ommlDomToLatex(root).trim();
        if (latex) return latex;
      }
    } catch {
      // Fall through to regex parser
    }
  }

  // Regex fallback
  let xml = ommlXml;

  // Fractions
  let prevXml = '';
  while (prevXml !== xml && xml.includes('<m:f')) {
    prevXml = xml;
    xml = xml.replace(/<m:f[^>]*>[\s\S]*?<m:num[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/g, (_, num, den) => {
      const cleanNum = ommlToLatex(num).trim();
      const cleanDen = ommlToLatex(den).trim();
      return `\\frac{${cleanNum}}{${cleanDen}}`;
    });
  }

  // Radicals
  xml = xml.replace(/<m:rad[^>]*>(?:[\s\S]*?<m:deg[^>]*>([\s\S]*?)<\/m:deg>)?[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/g, (_, deg, e) => {
    const cleanE = ommlToLatex(e).trim();
    if (deg && deg.trim()) {
      const cleanDeg = ommlToLatex(deg).trim();
      return `\\sqrt[${cleanDeg}]{${cleanE}}`;
    }
    return `\\sqrt{${cleanE}}`;
  });

  // SubSup
  xml = xml.replace(/<m:sSubSup[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/g, (_, e, sub, sup) => {
    return `{${ommlToLatex(e).trim()}}_{${ommlToLatex(sub).trim()}}^{${ommlToLatex(sup).trim()}}`;
  });

  // Superscript
  xml = xml.replace(/<m:sSup[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/g, (_, e, sup) => {
    return `{${ommlToLatex(e).trim()}}^{${ommlToLatex(sup).trim()}}`;
  });

  // Subscript
  xml = xml.replace(/<m:sSub[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/g, (_, e, sub) => {
    return `{${ommlToLatex(e).trim()}}_{${ommlToLatex(sub).trim()}}`;
  });

  // Delimiters
  xml = xml.replace(/<m:d[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:d>/g, (_, e) => {
    return `(${ommlToLatex(e).trim()})`;
  });

  // N-ary (sum, integral)
  xml = xml.replace(/<m:nary[^>]*>[\s\S]*?<m:sub[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:nary>/g, (_, sub, sup, e) => {
    const s = ommlToLatex(sub).trim();
    const p = ommlToLatex(sup).trim();
    const expr = ommlToLatex(e).trim();
    return `\\sum_{${s}}^{${p}}{${expr}}`;
  });

  // Overline
  xml = xml.replace(/<m:bar[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:bar>/g, (_, e) => {
    return `\\overline{${ommlToLatex(e).trim()}}`;
  });

  // Math text tags <m:t>
  xml = xml.replace(/<m:t[^>]*>(.*?)<\/m:t>/g, '$1');

  // Strip remaining XML tags
  xml = xml.replace(/<[^>]+>/g, '');

  return normalizeMathSymbols(xml);
}

/**
 * Extracts content from Word (.docx) file:
 * - Converts OMML equations (<m:oMath>, <m:oMathPara>) to LaTeX ($...$)
 * - Extracts embedded images from word/media/ and converts to base64 Data URLs
 * - Prevents duplicate images from DrawingML and VML fallback (<mc:AlternateContent>)
 * - Preserves superscript and subscript runs
 * - Preserves table cells and returns formatted text with [IMG:data:...] markers and LaTeX equations
 */
export async function extractDocxWithMediaAndEquations(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Extract relationships in word/_rels/document.xml.rels to map rId to media path
    const relsFile = zip.file('word/_rels/document.xml.rels');
    const imageMap: Record<string, string> = {}; // rId -> dataUrl

    if (relsFile) {
      const relsXml = await relsFile.async('text');
      // Match Relationship tag attributes regardless of order
      const relTagRegex = /<Relationship\b([^>]*)\/?>/gi;
      let relMatch: RegExpExecArray | null;

      while ((relMatch = relTagRegex.exec(relsXml)) !== null) {
        const attrs = relMatch[1];
        const idMatch = attrs.match(/\bId\s*=\s*"([^"]+)"/i);
        const targetMatch = attrs.match(/\bTarget\s*=\s*"([^"]+)"/i);

        if (idMatch && targetMatch) {
          const id = idMatch[1];
          let target = targetMatch[1];

          // Check if target is a media file
          if (/media\/|\.(?:png|jpe?g|gif|webp|svg|bmp)$/i.test(target)) {
            // Normalize path in zip (e.g. media/image1.png -> word/media/image1.png)
            let zipPath = target;
            if (!zipPath.startsWith('word/')) {
              zipPath = `word/${zipPath.replace(/^\.?\/?/, '')}`;
            }

            let imgZipFile = zip.file(zipPath);
            if (!imgZipFile) {
              // Try finding file directly by media filename
              const filename = target.split('/').pop();
              if (filename) {
                const found = zip.file(new RegExp(`media/${filename}$`, 'i'));
                if (found && found.length > 0) {
                  imgZipFile = found[0];
                }
              }
            }

            if (imgZipFile) {
              const ext = target.split('.').pop()?.toLowerCase() || 'png';
              const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                : ext === 'gif' ? 'image/gif'
                : ext === 'webp' ? 'image/webp'
                : ext === 'svg' ? 'image/svg+xml'
                : ext === 'bmp' ? 'image/bmp'
                : 'image/png';

              const base64Data = await imgZipFile.async('base64');
              imageMap[id] = `data:${mimeType};base64,${base64Data}`;
            }
          }
        }
      }
    }

    // 2. Read word/document.xml
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      return extractTextFromDocxFallback(arrayBuffer);
    }

    let docXml = await docFile.async('text');

    // 3. Remove <mc:Fallback> inside <mc:AlternateContent> so images aren't extracted twice (Choice vs Fallback)
    docXml = docXml.replace(/<mc:AlternateContent[^>]*>[\s\S]*?<mc:Choice[^>]*>([\s\S]*?)<\/mc:Choice>[\s\S]*?<mc:Fallback[^>]*>[\s\S]*?<\/mc:Fallback>[\s\S]*?<\/mc:AlternateContent>/gi, '$1');

    // 4. Process paragraphs <w:p>
    const paragraphRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
    const extractedParagraphs: string[] = [];
    let pMatch: RegExpExecArray | null;

    while ((pMatch = paragraphRegex.exec(docXml)) !== null) {
      let pContent = pMatch[1];

      // Convert OMML equations <m:oMathPara> or <m:oMath> to LaTeX
      pContent = pContent.replace(/<m:oMathPara(?: [^>]*)?>([\s\S]*?)<\/m:oMathPara>/g, (_: string, inner: string) => {
        return inner.replace(/<m:oMath(?: [^>]*)?>([\s\S]*?)<\/m:oMath>/g, (_2: string, omml: string) => {
          const latex = ommlToLatex(omml);
          return latex ? ` $${latex}$ ` : '';
        });
      });

      pContent = pContent.replace(/<m:oMath(?: [^>]*)?>([\s\S]*?)<\/m:oMath>/g, (_, omml) => {
        const latex = ommlToLatex(omml);
        return latex ? ` $${latex}$ ` : '';
      });

      // Convert embedded image tags:
      // DrawingML: <a:blip ... r:embed="rIdX"> or <a:blip ... r:link="rIdX">
      // VML: <v:imagedata ... r:id="rIdX"> or <v:imagedata ... o:relid="rIdX"> or src="rIdX"
      pContent = pContent.replace(/<(?:a:blip|v:imagedata)\b([^>]*)\/?>/gi, (_, attrs) => {
        const idMatch = attrs.match(/\b(?:r:embed|r:id|o:relid|src)\s*=\s*"([^"]+)"/i);
        if (idMatch) {
          const rId = idMatch[1];
          const dataUrl = imageMap[rId];
          if (dataUrl) {
            return `\n[IMG:${dataUrl}]\n`;
          }
        }
        return '';
      });

      // Handle superscripts and subscripts in text runs
      pContent = pContent.replace(/<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g, (_, runInner) => {
        const isSup = /<w:vertAlign[^>]+w:val="superscript"[^>]*\/>/i.test(runInner);
        const isSub = /<w:vertAlign[^>]+w:val="subscript"[^>]*\/>/i.test(runInner);

        let runText = '';
        const tRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
        let tMatch: RegExpExecArray | null;
        while ((tMatch = tRegex.exec(runInner)) !== null) {
          runText += tMatch[1];
        }

        if (isSup && runText) return `^{${runText}}`;
        if (isSub && runText) return `_{${runText}}`;
        return runText;
      });

      // Clean remaining tags in this paragraph
      let cleanP = pContent
        .replace(/<w:br\/>|<w:cr\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();

      if (cleanP) {
        extractedParagraphs.push(cleanP);
      }
    }

    const fullText = extractedParagraphs.join('\n');
    if (fullText.trim().length > 0) {
      return fullText;
    }

    return extractTextFromDocxFallback(arrayBuffer);
  } catch (err) {
    console.warn('Advanced docx extraction failed, using mammoth fallback:', err);
    return extractTextFromDocxFallback(arrayBuffer);
  }
}

/**
 * Mammoth Fallback with Image conversion to Data URI
 */
async function extractTextFromDocxFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammothAny = mammoth as any;
    const mammothOptions: any = { arrayBuffer };
    if (mammothAny.images && typeof mammothAny.images.imgElement === 'function') {
      mammothOptions.convertImage = mammothAny.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: any) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`
          };
        });
      });
    }

    const htmlResult = await mammothAny.convertToHtml(mammothOptions);

    let text = htmlResult.value || '';
    text = text
      .replace(/<img[^>]+src="([^">]+)"[^>]*>/gi, (_: string, src: string) => `\n[IMG:${src}]\n`)
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    return text;
  } catch (error) {
    console.error('Failed to extract text from docx fallback:', error);
    throw new Error('Gagal membaca file Word (.docx). Pastikan file berformat .docx yang valid.');
  }
}

/**
 * Legacy wrapper for backward compatibility
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  return extractDocxWithMediaAndEquations(arrayBuffer);
}

/**
 * Helper to extract option letters from answer key text.
 * Handles single letters, comma/semicolon/and separated letters, or option labels:
 * "A", "B", "A, B, C", "A dan C", "A & D", "Pilihan B", "Opsi C", "[A]", "(B)", "A."
 */
function extractOptionLetters(keyVal: string): string[] {
  if (!keyVal) return [];

  // Match letters preceded by boundary or start, e.g. "A, C" or "A dan B"
  const clean = keyVal
    .replace(/\b(?:pilihan|opsi|jawaban|kunci|nomor|no|adalah|yaitu|merupakan)\b/gi, '')
    .replace(/\band\b/gi, ',')
    .replace(/\bdan\b/gi, ',')
    .replace(/[&;/+]/g, ',');

  const letters: string[] = [];
  const parts = clean.split(/[,,\s]+/);

  for (const part of parts) {
    const trimmed = part.trim().toUpperCase().replace(/[()[\].:*]/g, '');
    if (/^[A-E]$/.test(trimmed) && !letters.includes(trimmed)) {
      letters.push(trimmed);
    }
  }

  return letters;
}

/**
 * Checks if a line is an answer key marker placed directly below options:
 * Matches formats:
 * - KUNCI: A
 * - Kunci: B
 * - KUNCI JAWABAN: C
 * - Kunci Jawaban : D
 * - Kunci = A
 * - Jawaban: B
 * - Jawaban Benar: C
 * - Jawaban yang benar: D
 * - KUNCI A (without colon!)
 * - KUNCI JAWABAN B (without colon!)
 * - Jawaban C (without colon!)
 * - Jwb: A / Jwbn: B
 * - Answer: A / Ans: B / Key: C
 * - *KUNCI: A* or **Kunci:** B
 * - KUNCI: [A] or KUNCI: (B) or KUNCI: C.
 * - KUNCI: Opsi A / KUNCI: Pilihan B
 * - KUNCI: A, B, C / KUNCI: A dan C
 */
function matchAnswerKeyLine(line: string): string | null {
  const cleanLine = line
    .replace(/^[*_~`#\s]+|[*_~`#\s]+$/g, '') // Strip markdown formatting like **Kunci:**
    .trim();

  // Pattern 1: With colon or equals sign: "KUNCI: A", "Kunci Jawaban : B", "Jawaban = C"
  const colonMatch = cleanLine.match(/^(?:\[?(?:KUNCI(?:\s*(?:SOAL|JAWABAN|BENAR))?|JAWABAN(?:\s*(?:BENAR|SOAL|YANG\s+BENAR))?|KUNCIAN|ANSWER|KEY|ANS|JWB|JWBN)\s*[:=]\s*(.+?)\]?)$/i);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  // Pattern 2: Without colon: "KUNCI A", "KUNCI JAWABAN B", "JAWABAN C", "KEY D"
  const noColonMatch = cleanLine.match(/^(?:KUNCI(?:\s*(?:JAWABAN|BENAR))?|JAWABAN(?:\s*(?:BENAR|YANG\s+BENAR))?|ANSWER|KEY|JWB)\s+([A-Ea-e](?:\s*[,;&]\s*[A-Ea-e])*(?:\s*(?:dan|and)\s*[A-Ea-e])?|[A-Ea-e]\b.*)$/i);
  if (noColonMatch) {
    return noColonMatch[1].trim();
  }

  return null;
}

/**
 * Parses questions from formatted text (extracted from Word or pasted)
 * Supports:
 * - Equations (OMML / LaTeX formulas like \frac, \sqrt, $...$)
 * - Images attached directly ([IMG:dataUrl])
 * - Automatic answer key detection below multiple choice options
 */
export function parseQuestionsFromText(text: string, defaultSubject: string = 'Umum'): ParseResult {
  const warnings: string[] = [];
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const questions: Question[] = [];
  let currentQ: Partial<Question> | null = null;
  let currentOptions: QuestionOption[] = [];
  let currentMatchingPairs: MatchingPair[] = [];
  let explicitType: QuestionType | null = null;
  let qNumber = 1;

  let totalEquations = 0;
  let totalImages = 0;
  let totalKeysDetected = 0;

  // Secondary answer keys map (for documents having a summary key list at the bottom: 1. A, 2. B, 3. C)
  const bottomKeyMap: Record<number, string[]> = {};
  let inBottomKeySection = false;

  const finalizeCurrentQuestion = () => {
    if (!currentQ || !currentQ.text) return;

    let finalType: QuestionType = explicitType || 'multiple_choice';

    // Auto-detect question type if not explicitly tagged
    if (!explicitType) {
      if (currentMatchingPairs.length > 0) {
        finalType = 'matching';
      } else if (currentQ.correctOptionIds && currentQ.correctOptionIds.length > 1) {
        finalType = 'multiple_choice_complex';
      } else if (currentOptions.length > 0) {
        finalType = 'multiple_choice';
      } else {
        finalType = 'essay';
      }
    }

    // Default 4 options if multiple choice has no options
    const finalOptions: QuestionOption[] = currentOptions.length > 0 ? currentOptions : [
      { id: 'opt-a', text: 'Pilihan A' },
      { id: 'opt-b', text: 'Pilihan B' },
      { id: 'opt-c', text: 'Pilihan C' },
      { id: 'opt-d', text: 'Pilihan D' },
    ];

    // Ensure correctOptionId is set
    let correctId = currentQ.correctOptionId;
    let correctIds = currentQ.correctOptionIds;

    if (!correctId && finalOptions.length > 0) {
      // Find option marked isCorrect
      const markedOpt = finalOptions.find(o => o.isCorrect);
      if (markedOpt) {
        correctId = markedOpt.id;
        correctIds = [markedOpt.id];
      } else {
        // Check if there was an answer key detected
        correctId = finalOptions[0].id;
        correctIds = [finalOptions[0].id];
        if (finalType === 'multiple_choice') {
          warnings.push(`Soal #${questions.length + 1}: Kunci jawaban tidak ditemukan di bawah pilihan ganda. Otomatis disetel ke Opsi A.`);
        }
      }
    }

    if (!correctIds || correctIds.length === 0) {
      correctIds = correctId ? [correctId] : [finalOptions[0].id];
    }

    // Mark isCorrect flag on matching options
    finalOptions.forEach(opt => {
      opt.isCorrect = Boolean(correctIds?.includes(opt.id));
    });

    // Count equations and images
    const fullQuestionContent = `${currentQ.text || ''} ${finalOptions.map(o => o.text).join(' ')}`;
    if (fullQuestionContent.includes('$') || fullQuestionContent.includes('\\frac') || fullQuestionContent.includes('\\sqrt') || fullQuestionContent.includes('\\sum') || fullQuestionContent.includes('^') || fullQuestionContent.includes('_')) {
      totalEquations++;
    }
    if (currentQ.image || finalOptions.some(o => o.image)) {
      totalImages++;
    }

    const q: Question = {
      id: `q-parsed-${Date.now()}-${questions.length + 1}`,
      number: questions.length + 1,
      type: finalType,
      text: currentQ.text,
      image: currentQ.image,
      points: currentQ.points || 10,
      category: defaultSubject,
      difficulty: currentQ.difficulty || 'sedang',
      options: finalOptions,
      correctOptionId: correctId,
      correctOptionIds: correctIds,
      matchingPairs: currentMatchingPairs.length > 0 ? currentMatchingPairs : undefined,
      sampleAnswer: currentQ.sampleAnswer,
      keywords: currentQ.keywords,
    };

    questions.push(q);

    // Reset for next question
    currentQ = null;
    currentOptions = [];
    currentMatchingPairs = [];
    explicitType = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];

    // Check if entering a document-level summary answer key section at bottom (e.g. "KUNCI JAWABAN:")
    if (!currentQ && /^(?:KUNCI\s*JAWABAN|DAFTAR\s*KUNCI|KUNCI\s*SOAL)\s*:?$/i.test(line)) {
      inBottomKeySection = true;
      continue;
    }

    if (inBottomKeySection) {
      // Match "1. A" or "1. B, C" or "1: A"
      const bottomMatch = line.match(/^(\d+)[\.\:\)]\s*([A-Ea-e](?:\s*[,;&]\s*[A-Ea-e])*)/);
      if (bottomMatch) {
        const qNum = parseInt(bottomMatch[1], 10);
        const letters = extractOptionLetters(bottomMatch[2]);
        if (letters.length > 0) {
          bottomKeyMap[qNum] = letters;
        }
      }
      continue;
    }

    // Check for standalone image marker on line: [IMG:data:image/...]
    const imgOnlyMatch = line.match(/^\[IMG:(data:image\/[^\]]+)\]$/i);
    if (imgOnlyMatch) {
      const dataUrl = imgOnlyMatch[1];
      if (currentQ) {
        if (currentOptions.length > 0) {
          // Belongs to the last option
          const lastOpt = currentOptions[currentOptions.length - 1];
          lastOpt.image = dataUrl;
        } else {
          // Belongs to current question
          currentQ.image = dataUrl;
        }
      }
      continue;
    }

    // Check for explicit question type header: [TIPE: PG], [TIPE: PG_KOMPLEKS], [TIPE: MENJODOHKAN], [TIPE: ESAI]
    const typeHeaderMatch = line.match(/^\[(?:TIPE|JENIS):\s*(PG_KOMPLEKS|PILIHAN_GANDA_KOMPLEKS|KOMPLEKS|MENJODOHKAN|JODOHKAN|MATCHING|ESAI|URAIAN|PG|PILIHAN_GANDA)\]/i);
    if (typeHeaderMatch) {
      const tag = typeHeaderMatch[1].toUpperCase();
      if (tag.includes('KOMPLEKS')) {
        explicitType = 'multiple_choice_complex';
      } else if (tag.includes('JODOH') || tag.includes('MATCH')) {
        explicitType = 'matching';
      } else if (tag.includes('ESAI') || tag.includes('URAIAN')) {
        explicitType = 'essay';
      } else {
        explicitType = 'multiple_choice';
      }
      continue;
    }

    // Check for question start: "1.", "1)", "Soal 1:", "[1]", "1 -", "No. 1."
    const questionStartMatch = line.match(/^(?:(?:Soal|No\.?|Nomor|Pertanyaan)\s*)?(?:\[(\d+)\]|(\d+)[\.\)]|(\d+)\s*[-:])\s*(.+)/i);
    if (questionStartMatch) {
      finalizeCurrentQuestion();
      const numStr = questionStartMatch[1] || questionStartMatch[2] || questionStartMatch[3];
      let qText = questionStartMatch[4].trim();

      // Extract inline image if present in question text
      let qImg: string | undefined;
      const imgMatch = qText.match(/\[IMG:(data:image\/[^\]]+)\]/i);
      if (imgMatch) {
        qImg = imgMatch[1];
        qText = qText.replace(imgMatch[0], '').trim();
      }

      currentQ = {
        number: parseInt(numStr, 10) || qNumber++,
        text: qText,
        image: qImg,
        points: 10,
        difficulty: 'sedang',
      };
      continue;
    }

    if (!currentQ) {
      // If text exists before first question number, initialize Question 1
      if (!line.startsWith('A.') && !line.toLowerCase().startsWith('kunci:') && !line.toLowerCase().startsWith('poin:')) {
        let qImg: string | undefined;
        let qText = line;
        const imgMatch = qText.match(/\[IMG:(data:image\/[^\]]+)\]/i);
        if (imgMatch) {
          qImg = imgMatch[1];
          qText = qText.replace(imgMatch[0], '').trim();
        }

        currentQ = {
          number: qNumber++,
          text: qText,
          image: qImg,
          points: 10,
          difficulty: 'sedang',
        };
      }
      continue;
    }

    // Check for option line: "A. ...", "A)", "(A) ...", "[ ] A. ...", "[x] A. ...", "A. [IMG:...]"
    const optionMatch = line.match(/^(?:\[([ xX*]?)\]\s*)?\(?([A-Ea-e])\)?[\.\:\)]\s*(.*)/);
    if (optionMatch) {
      const checkboxMark = optionMatch[1]; // x or X or *
      const letter = optionMatch[2].toUpperCase();
      let optText = (optionMatch[3] || '').trim();

      // Extract option image if present: [IMG:dataUrl]
      let optImg: string | undefined;
      const imgMatch = optText.match(/\[IMG:(data:image\/[^\]]+)\]/i);
      if (imgMatch) {
        optImg = imgMatch[1];
        optText = optText.replace(imgMatch[0], '').trim();
      }

      // Check if option line is marked as correct directly (e.g. *A. ..., A. ... (KUNCI), A. ... *)
      let isOptCorrect = Boolean(checkboxMark && (checkboxMark.toLowerCase() === 'x' || checkboxMark === '*'));
      if (/\(kunci(?:\s*jawaban)?\)|\*$/i.test(optText)) {
        isOptCorrect = true;
        optText = optText.replace(/\(kunci(?:\s*jawaban)?\)|\*$/i, '').trim();
      }

      // If option has only image and no text, give it a placeholder label
      if (!optText && optImg) {
        optText = `(Gambar Opsi ${letter})`;
      }

      const optId = `opt-${letter.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      currentOptions.push({
        id: optId,
        text: optText,
        image: optImg,
        isCorrect: isOptCorrect,
      });

      if (isOptCorrect) {
        if (!currentQ.correctOptionId) {
          currentQ.correctOptionId = optId;
        }
        currentQ.correctOptionIds = currentQ.correctOptionIds ? [...currentQ.correctOptionIds, optId] : [optId];
        totalKeysDetected++;
      }

      continue;
    }

    // Check for matching pair line: "- Left => Right" or "Left -> Right" or "• Left = Right"
    const matchingMatch = line.match(/^(?:[-*•]\s*)?(.+?)\s*(?:=>|->|==|:)\s*(.+)$/);
    if (matchingMatch && (explicitType === 'matching' || line.includes('=>') || line.includes('->'))) {
      const left = matchingMatch[1].replace(/^[-*•]\s*/, '').trim();
      const right = matchingMatch[2].trim();
      if (left && right && !left.toLowerCase().startsWith('kunci') && !left.toLowerCase().startsWith('poin')) {
        currentMatchingPairs.push({
          id: `pair-${currentMatchingPairs.length + 1}`,
          leftPrompt: left,
          rightAnswer: right,
        });
        continue;
      }
    }

    // =========================================================================
    // AUTOMATIC ANSWER KEY DETECTION (BELOW MULTIPLE CHOICE OPTIONS)
    // Supports all Indonesian exam formats:
    // - "Kunci: A"
    // - "KUNCI JAWABAN: C"
    // - "Kunci Jawaban : B"
    // - "Jawaban: A"
    // - "Jawaban Benar: B"
    // - "Kunci A" (without colon!)
    // - "KUNCI JAWABAN B" (without colon!)
    // - "Jawaban C" (without colon!)
    // - "Kunci = B"
    // - "Kunci: A, B, C" / "Kunci: A dan C" (PG Kompleks)
    // - "Answer: A" or "KEY: B" or "ANS: C"
    // =========================================================================
    const matchedKeyVal = matchAnswerKeyLine(line);
    if (matchedKeyVal) {
      const keyVal = matchedKeyVal.trim();
      const letters = extractOptionLetters(keyVal);

      if (letters.length > 1) {
        // Multiple Choice Complex (Lebih dari satu jawaban benar)
        explicitType = 'multiple_choice_complex';
        const matchedIds: string[] = [];

        letters.forEach(letter => {
          const optIdx = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
          if (currentOptions[optIdx]) {
            currentOptions[optIdx].isCorrect = true;
            matchedIds.push(currentOptions[optIdx].id);
          } else {
            // Match by id starting with opt-letter
            const optByLetter = currentOptions.find(o => o.id.startsWith(`opt-${letter.toLowerCase()}`));
            if (optByLetter) {
              optByLetter.isCorrect = true;
              matchedIds.push(optByLetter.id);
            }
          }
        });

        if (matchedIds.length > 0) {
          currentQ.correctOptionIds = matchedIds;
          currentQ.correctOptionId = matchedIds[0];
          totalKeysDetected++;
        }
      } else if (letters.length === 1) {
        // Single Multiple Choice
        const letter = letters[0];
        const optIdx = letter.charCodeAt(0) - 65;

        let matchedOpt: QuestionOption | undefined = currentOptions[optIdx];
        if (!matchedOpt) {
          matchedOpt = currentOptions.find(o => o.id.startsWith(`opt-${letter.toLowerCase()}`));
        }

        if (matchedOpt) {
          currentOptions.forEach(o => {
            o.isCorrect = (o.id === matchedOpt!.id);
          });
          currentQ.correctOptionId = matchedOpt.id;
          currentQ.correctOptionIds = [matchedOpt.id];
          totalKeysDetected++;
        }
      } else {
        // If the teacher wrote option text instead of letter (e.g. "Kunci: Menghadap kiblat")
        const cleanKeyText = keyVal.toLowerCase().replace(/^(?:pilihan|opsi|jawaban)\s+/i, '').trim();
        const foundOpt = currentOptions.find(o => 
          cleanKeyText.length > 2 && (o.text.toLowerCase().includes(cleanKeyText) || cleanKeyText.includes(o.text.toLowerCase()))
        );

        if (foundOpt) {
          currentOptions.forEach(o => {
            o.isCorrect = (o.id === foundOpt.id);
          });
          currentQ.correctOptionId = foundOpt.id;
          currentQ.correctOptionIds = [foundOpt.id];
          totalKeysDetected++;
        } else {
          // Essay answer rubric or text sample
          currentQ.sampleAnswer = keyVal;
        }
      }
      continue;
    }

    // Check for Keywords: "KATA KUNCI: wudhu, rukun, niat"
    const keywordMatch = line.match(/^(?:KATA\s*KUNCI|KEYWORDS)\s*:\s*(.+)/i);
    if (keywordMatch) {
      currentQ.keywords = keywordMatch[1].split(/[,;]+/).map(k => k.trim()).filter(Boolean);
      continue;
    }

    // Check for Points: "POIN: 15" or "BOBOT: 20"
    const pointsMatch = line.match(/^(?:POIN|BOBOT|NILAI|SKOR)\s*[:=]\s*(\d+)/i);
    if (pointsMatch) {
      currentQ.points = parseInt(pointsMatch[1], 10) || 10;
      continue;
    }

    // Check for Difficulty: "TINGKAT: mudah|sedang|sukar"
    const diffMatch = line.match(/^(?:TINGKAT|KESULITAN)\s*[:=]\s*(mudah|sedang|sukar)/i);
    if (diffMatch) {
      currentQ.difficulty = diffMatch[1].toLowerCase() as any;
      continue;
    }

    // Append to current question text or option text (multi-line support)
    if (currentQ) {
      if (currentOptions.length === 0 && currentMatchingPairs.length === 0) {
        // Check for inline image inside multi-line question
        const imgMatch = line.match(/\[IMG:(data:image\/[^\]]+)\]/i);
        if (imgMatch && !currentQ.image) {
          currentQ.image = imgMatch[1];
          line = line.replace(imgMatch[0], '').trim();
        }
        if (line) {
          currentQ.text += '\n' + line;
        }
      } else if (currentOptions.length > 0) {
        // Multi-line option text
        const lastOpt = currentOptions[currentOptions.length - 1];
        const imgMatch = line.match(/\[IMG:(data:image\/[^\]]+)\]/i);
        if (imgMatch && !lastOpt.image) {
          lastOpt.image = imgMatch[1];
          line = line.replace(imgMatch[0], '').trim();
        }
        if (line) {
          lastOpt.text += ' ' + line;
        }
      }
    }
  }

  // Finalize last question in document
  finalizeCurrentQuestion();

  // If there were bottom-level keys found, apply to questions missing keys
  if (Object.keys(bottomKeyMap).length > 0) {
    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const letters = bottomKeyMap[qNum];
      if (letters && letters.length > 0) {
        if (letters.length === 1) {
          const letter = letters[0];
          const optIdx = letter.charCodeAt(0) - 65;
          if (q.options[optIdx]) {
            q.options.forEach((o, i) => { o.isCorrect = (i === optIdx); });
            q.correctOptionId = q.options[optIdx].id;
            q.correctOptionIds = [q.options[optIdx].id];
            totalKeysDetected++;
          }
        } else {
          q.type = 'multiple_choice_complex';
          const matchedIds: string[] = [];
          letters.forEach(letter => {
            const optIdx = letter.charCodeAt(0) - 65;
            if (q.options[optIdx]) {
              q.options[optIdx].isCorrect = true;
              matchedIds.push(q.options[optIdx].id);
            }
          });
          if (matchedIds.length > 0) {
            q.correctOptionIds = matchedIds;
            q.correctOptionId = matchedIds[0];
            totalKeysDetected++;
          }
        }
      }
    });
  }

  // Statistics
  const stats = {
    total: questions.length,
    multiple_choice: questions.filter(q => q.type === 'multiple_choice').length,
    multiple_choice_complex: questions.filter(q => q.type === 'multiple_choice_complex').length,
    matching: questions.filter(q => q.type === 'matching').length,
    essay: questions.filter(q => q.type === 'essay').length,
    withImages: totalImages,
    withEquations: totalEquations,
    keysDetected: totalKeysDetected,
    warnings,
  };

  return { questions, rawText: text, stats };
}

/**
 * Generates sample text for Word template reference,
 * demonstrating equations, images, and automatic answer keys.
 */
export function getSampleWordTemplateText(): string {
  return `FORMAT CONTOH SOAL UJIAN MADRASAH (CBT MTS)
=====================================================
Petunjuk Pembuatan Soal di Microsoft Word (.docx):
1. PERSAMAAN & RUMUS MATEMATIKA (EQUATION):
   - Anda dapat langsung menyisipkan Equation Microsoft Word (Insert > Equation).
   - Rumus pecahan (\\frac), bentuk akar (\\sqrt), pangkat (^), matriks, dan simbol matematika otomatis dikonversi dengan presisi KaTeX.
   - Atau langsung ketik format LaTeX: $x^2 + y^2 = r^2$, $\\frac{1}{2}$, $\\sqrt{144}$.

2. GAMBAR LANGSUNG DI DALAM WORD:
   - Cukup salin (copy-paste) atau Insert > Picture gambar langsung ke dalam dokumen Word.
   - Gambar soal atau gambar pilihan ganda akan langsung diekstrak otomatis!

3. PENDETEKSI KUNCI JAWABAN OTOMATIS:
   - Tuliskan kunci jawaban tepat di bawah pilihan ganda:
     Contoh: "KUNCI: B" atau "KUNCI JAWABAN: C" atau "Jawaban: A"
   - Untuk PG Kompleks (banyak kunci): "KUNCI: A, C, D" atau "KUNCI: A dan B"
   - Sistem secara otomatis menjadikannya kunci jawaban resmi tanpa perlu input manual satu per satu!

-----------------------------------------------------
CONTOH 1: PILIHAN GANDA DENGAN RUMUS MATEMATIKA (EQUATION)
-----------------------------------------------------
[TIPE: PG]
1. Tentukan hasil penyederhanaan dari persamaan aljabar $\\frac{2x^2 + 6x}{2x}$ untuk nilai $x \\neq 0$:
A. $x + 3$
B. $2x + 3$
C. $x^2 + 3$
D. $2x^2 + 3$
KUNCI: A
POIN: 10
TINGKAT: mudah

-----------------------------------------------------
CONTOH 2: PILIHAN GANDA DENGAN GAMBAR & BENTUK AKAR
-----------------------------------------------------
[TIPE: PG]
2. Perhatikan nilai penjumlahan bentuk akar $\\sqrt{144} + \\sqrt{25}$. Berapakah hasil operasi tersebut?
A. 15
B. 17
C. 19
D. 21
KUNCI: B
POIN: 10
TINGKAT: sedang

-----------------------------------------------------
CONTOH 3: PILIHAN GANDA KOMPLEKS (LEBIH DARI SATU KUNCI)
-----------------------------------------------------
[TIPE: PG_KOMPLEKS]
3. Manakah di antara pernyataan berikut yang merupakan rukun wudhu yang disepakati oleh madzhab Syafi'i? (Pilih semua yang benar)
A. Niat saat membasuh wajah
B. Membasuh kedua tangan sampai ke siku
C. Membaca doa setelah wudhu
D. Tertib (berurutan)
KUNCI: A, B, D
POIN: 15
TINGKAT: sedang

-----------------------------------------------------
CONTOH 4: MENJODOHKAN (MENCOCOKKAN PREMIS & JAWABAN)
-----------------------------------------------------
[TIPE: MENJODOHKAN]
4. Jodohkanlah nama kitab suci samawi berikut dengan nabi yang menerimanya:
- Kitab Taurat => Nabi Musa AS
- Kitab Zabur => Nabi Daud AS
- Kitab Injil => Nabi Isa AS
- Kitab Suci Al-Qur'an => Nabi Muhammad SAW
POIN: 20
TINGKAT: sedang

-----------------------------------------------------
CONTOH 5: ESAI / URAIAN
-----------------------------------------------------
[TIPE: ESAI]
5. Jelaskan secara ringkas hikmah disyariatkannya ibadah puasa Ramadhan bagi kesehatan jasmani dan ketakwaan seorang muslim!
KUNCI: Melatih pengendalian hawa nafsu, mendetoksifikasi racun tubuh, menumbuhkan empati sosial, dan meningkatkan ketaatan kepada Allah SWT.
KATA KUNCI: nafsu, empati, takwa, detoksifikasi
POIN: 25
TINGKAT: sedang
`;
}
