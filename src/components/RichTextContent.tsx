import { cn } from "@/lib/utils";
import { isRichTextEmpty, richTextToPlain } from "@/lib/richText";

type RichTextContentProps = {
  html: string;
  className?: string;
};

/** Muestra HTML del editor o texto plano legado. */
export function RichTextContent({ html, className }: RichTextContentProps) {
  if (!html || isRichTextEmpty(html)) return null;

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!looksLikeHtml) {
    return (
      <p className={cn("whitespace-pre-wrap", className)}>{html}</p>
    );
  }

  return (
    <div
      className={cn(
        "text-sm [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function richTextPreviewText(html: string): string {
  if (!html || isRichTextEmpty(html)) return "";
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html);
  return looksLikeHtml ? richTextToPlain(html) : html;
}
