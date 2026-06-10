"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

export function StarRating({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  max = 5,
  size = "md",
  className,
}: StarRatingProps) {
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            disabled={readOnly || disabled}
            onClick={() => {
              if (readOnly || disabled || !onChange) return;
              onChange(starValue === value ? null : starValue);
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-sm transition-colors",
              readOnly || disabled
                ? "cursor-default"
                : "cursor-pointer hover:scale-105",
            )}
            aria-label={`${starValue} estrellas`}
          >
            <Star
              className={cn(
                iconSize,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
