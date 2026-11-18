import { parseDateOnly } from "./utils";

const MIN_MONTHS = 3;

function monthsIn(expenses: { date: string }[], year: number): Set<number> {
  const months = new Set<number>();
  for (const expense of expenses) {
    const parsed = parseDateOnly(expense.date);
    if (parsed && parsed.getFullYear() === year) months.add(parsed.getMonth());
  }
  return months;
}

export function annualSpendProjection(
  expenses: { date: string; amount: number }[],
  selectedYear: number,
): {
  showProjection: boolean;
  projectedAnnualSpend: number | null;
  priorYearSpend: number | null;
  showYoY: boolean;
  yoyPercent: number | null;
} {
  const currentMonths = monthsIn(expenses, selectedYear);
  const priorMonths = monthsIn(expenses, selectedYear - 1);
  const priorYearSpend = expenses.reduce((sum, expense) => {
    const parsed = parseDateOnly(expense.date);
    return parsed && parsed.getFullYear() === selectedYear - 1 ? sum + expense.amount : sum;
  }, 0);

  if (currentMonths.size < MIN_MONTHS) {
    return {
      showProjection: false,
      projectedAnnualSpend: null,
      priorYearSpend: priorMonths.size > 0 ? priorYearSpend : null,
      showYoY: false,
      yoyPercent: null,
    };
  }

  const currentTotal = expenses.reduce((sum, expense) => {
    const parsed = parseDateOnly(expense.date);
    return parsed && parsed.getFullYear() === selectedYear ? sum + expense.amount : sum;
  }, 0);
  const projectedAnnualSpend = Math.round((currentTotal / currentMonths.size) * 12);
  const showYoY = priorMonths.size >= MIN_MONTHS && priorYearSpend > 0;
  const yoyPercent = showYoY
    ? Math.round(((projectedAnnualSpend - priorYearSpend) / priorYearSpend) * 100)
    : null;

  return {
    showProjection: true,
    projectedAnnualSpend,
    priorYearSpend: priorMonths.size > 0 ? priorYearSpend : null,
    showYoY,
    yoyPercent,
  };
}
