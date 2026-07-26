export type OrderExpense = {
  concept: string;
  price: number;
};

export type OrderExpenseRow = {
  id: string;
  concept: string;
  price: string;
};

export function createExpenseRow(): OrderExpenseRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    concept: "",
    price: "",
  };
}

export function parseOrderExpenses(value: unknown): OrderExpense[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const concept = String(
          (item as { concept?: unknown }).concept ?? "",
        ).trim();
        const price = Number((item as { price?: unknown }).price);
        if (concept === "" || !Number.isFinite(price) || price < 0) return null;
        return { concept, price };
      })
      .filter((item): item is OrderExpense => item !== null);
  }
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      return parseOrderExpenses(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function expensesToFormRows(expenses: OrderExpense[]): OrderExpenseRow[] {
  if (expenses.length === 0) return [createExpenseRow()];
  return expenses.map((e, index) => ({
    id: `exp-${index}-${e.concept.slice(0, 8)}-${e.price}`,
    concept: e.concept,
    price: String(e.price),
  }));
}

export function normalizeExpenseRows(rows: OrderExpenseRow[]): OrderExpense[] {
  return rows
    .map((row) => ({
      concept: row.concept.trim(),
      price: parseFloat(row.price.replace(",", ".")) || 0,
    }))
    .filter((row) => row.concept !== "" && row.price >= 0);
}

export function sumExpenses(expenses: OrderExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.price, 0);
}

export function netProfit(orderPrice: number, expenses: OrderExpense[]): number {
  return orderPrice - sumExpenses(expenses);
}

export function formatMoney(value: number): string {
  return value.toLocaleString("es-PE", { minimumFractionDigits: 2 });
}

/** Margen de ganancia neta sobre el precio de cotización (0–100). */
export function netProfitMarginPercent(
  orderPrice: number,
  expenses: OrderExpense[],
): number | null {
  if (orderPrice <= 0) return null;
  return (netProfit(orderPrice, expenses) / orderPrice) * 100;
}

const DEFAULT_LOW_MARGIN_THRESHOLD_PERCENT = 40;

export function isBelowProfitMarginThreshold(
  orderPrice: number,
  expenses: OrderExpense[],
  thresholdPercent = DEFAULT_LOW_MARGIN_THRESHOLD_PERCENT,
): boolean {
  const margin = netProfitMarginPercent(orderPrice, expenses);
  if (margin === null) return false;
  return margin < thresholdPercent;
}
