import type { jsPDF } from "jspdf";
import { isRichTextEmpty } from "@/lib/richText";

export type PdfTextStyle = "normal" | "bold" | "italic" | "bolditalic";

export type PdfTextSegment = {
  text: string;
  style: PdfTextStyle;
};

export type PdfRichTextLine = {
  prefix: string;
  indent: number;
  segments: PdfTextSegment[];
  maxWidth: number;
};

function styleFromTags(bold: boolean, italic: boolean): PdfTextStyle {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function pushTextSegment(segments: PdfTextSegment[], text: string, style: PdfTextStyle) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.style === style) {
    last.text += text;
    return;
  }
  segments.push({ text, style });
}

function parseInlineNodes(
  node: Node,
  segments: PdfTextSegment[],
  bold = false,
  italic = false,
) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      pushTextSegment(segments, child.textContent ?? "", styleFromTags(bold, italic));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      pushTextSegment(segments, "\n", styleFromTags(bold, italic));
      return;
    }
    const nextBold = bold || tag === "strong" || tag === "b";
    const nextItalic = italic || tag === "em" || tag === "i";
    parseInlineNodes(el, segments, nextBold, nextItalic);
  });
}

function splitSegmentByNewlines(segments: PdfTextSegment[]): PdfTextSegment[][] {
  const lines: PdfTextSegment[][] = [[]];
  for (const segment of segments) {
    const parts = segment.text.split("\n");
    parts.forEach((part, index) => {
      if (part) {
        lines[lines.length - 1].push({ text: part, style: segment.style });
      }
      if (index < parts.length - 1) {
        lines.push([]);
      }
    });
  }
  return lines.filter((line) => line.length > 0);
}

function setPdfFont(pdf: jsPDF, style: PdfTextStyle, fontSize: number) {
  pdf.setFontSize(fontSize);
  const fontStyle =
    style === "bold" || style === "bolditalic"
      ? "bold"
      : style === "italic"
        ? "italic"
        : "normal";
  pdf.setFont("helvetica", fontStyle);
}

function measureSegmentsWidth(pdf: jsPDF, segments: PdfTextSegment[], fontSize: number) {
  return segments.reduce((sum, segment) => {
    setPdfFont(pdf, segment.style, fontSize);
    return sum + pdf.getTextWidth(segment.text);
  }, 0);
}

function wrapSegmentsToWidth(
  pdf: jsPDF,
  segments: PdfTextSegment[],
  maxWidth: number,
  fontSize: number,
): PdfTextSegment[][] {
  const words: PdfTextSegment[] = [];
  for (const segment of segments) {
    const parts = segment.text.split(/(\s+)/).filter((part) => part.length > 0);
    for (const part of parts) {
      words.push({ text: part, style: segment.style });
    }
  }

  const lines: PdfTextSegment[][] = [];
  let current: PdfTextSegment[] = [];

  const flush = () => {
    if (current.length > 0) {
      lines.push(current);
      current = [];
    }
  };

  for (const word of words) {
    const trial = [...current, word];
    if (measureSegmentsWidth(pdf, trial, fontSize) <= maxWidth || current.length === 0) {
      const last = current[current.length - 1];
      if (last && last.style === word.style && !/\s+$/.test(last.text) && !/^\s+/.test(word.text)) {
        last.text += word.text;
      } else {
        current.push({ ...word });
      }
      continue;
    }
    flush();
    current.push({ ...word });
  }
  flush();
  return lines.length > 0 ? lines : [[]];
}

export function buildPdfLinesFromHtml(
  html: string,
  pdf: jsPDF,
  contentWidth: number,
  fontSize = 9,
): PdfRichTextLine[] {
  if (!html || isRichTextEmpty(html)) return [];

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!looksLikeHtml || typeof document === "undefined") {
    const wrapped = wrapSegmentsToWidth(
      pdf,
      [{ text: html, style: "normal" }],
      contentWidth,
      fontSize,
    );
    return wrapped.map((segments) => ({
      prefix: "",
      indent: 0,
      segments,
      maxWidth: contentWidth,
    }));
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: PdfRichTextLine[] = [];
  const listIndent = 5;

  const pushWrapped = (
    prefix: string,
    indent: number,
    maxWidth: number,
    segments: PdfTextSegment[],
  ) => {
    setPdfFont(pdf, "normal", fontSize);
    const prefixWidth = prefix ? pdf.getTextWidth(prefix) : 0;
    const available = Math.max(10, maxWidth - prefixWidth);
    wrapSegmentsToWidth(pdf, segments, available, fontSize).forEach((wrapped) => {
      lines.push({ prefix, indent, segments: wrapped, maxWidth });
    });
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        pushWrapped("", 0, contentWidth, [{ text, style: "normal" }]);
      }
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "p") {
      const segments: PdfTextSegment[] = [];
      parseInlineNodes(el, segments);
      splitSegmentByNewlines(segments).forEach((paragraphSegments) => {
        pushWrapped("", 0, contentWidth, paragraphSegments);
      });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      el.querySelectorAll(":scope > li").forEach((li, index) => {
        const segments: PdfTextSegment[] = [];
        parseInlineNodes(li, segments);
        const prefix = ordered ? `${index + 1}. ` : "• ";
        splitSegmentByNewlines(segments).forEach((itemSegments, lineIndex) => {
          if (lineIndex === 0) {
            pushWrapped(prefix, 0, contentWidth, itemSegments);
          } else {
            pushWrapped("", listIndent, contentWidth, itemSegments);
          }
        });
      });
    }
  });

  return lines;
}

export function drawPdfRichTextLine(
  pdf: jsPDF,
  x: number,
  y: number,
  line: PdfRichTextLine,
  fontSize: number,
) {
  const startX = x + line.indent;
  let cursorX = startX;
  if (line.prefix) {
    setPdfFont(pdf, "normal", fontSize);
    pdf.text(line.prefix, cursorX, y);
    cursorX += pdf.getTextWidth(line.prefix);
  }
  for (const segment of line.segments) {
    setPdfFont(pdf, segment.style, fontSize);
    pdf.text(segment.text, cursorX, y);
    cursorX += pdf.getTextWidth(segment.text);
  }
}

export function measureRichTextBlockHeight(
  lineCount: number,
  lineHeight: number,
  padding: number,
  minHeight = 12,
): number {
  if (lineCount === 0) return minHeight;
  return Math.max(minHeight, lineCount * lineHeight + padding * 2);
}

export function hasRenderableDescription(description: string | null | undefined): boolean {
  if (!description?.trim()) return false;
  return !isRichTextEmpty(description);
}
