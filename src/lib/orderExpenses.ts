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

export type OrderProfitLevel = "healthy" | "low" | "loss";

/** Ganancia neta vs cotización: ≥40% verde, [0,40%) ámbar, &lt;0 rojo. */
export function classifyOrderProfit(
  orderPrice: number,
  profitAmount: number,
  thresholdPercent = 40,
): OrderProfitLevel {
  if (profitAmount < 0) return "loss";
  if (orderPrice <= 0) return "healthy";
  const margin = (profitAmount / orderPrice) * 100;
  return margin < thresholdPercent ? "low" : "healthy";
}

export function lowMarginReviewMessage(profitAmount: number): string {
  return `Esta cotización requiere ser evaluada nuevamente, ya que este pedido involucró una ganancia menor al 40%: S/. ${formatMoney(profitAmount)}`;
}

export function lossReviewMessage(profitAmount: number): string {
  const loss = Math.abs(profitAmount);
  return `Este pedido registró una pérdida de S/. ${formatMoney(loss)}. Conviene revisar la cotización y los gastos.`;
}
