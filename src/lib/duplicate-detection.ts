import type { Expense } from './types';

export interface DuplicateGroup {
  id: string;
  expenses: Expense[];
  confidence: 'high' | 'medium';
  reason: string;
}

function normalizeDescription(desc: string | null): string {
  if (!desc) return '';
  return desc.toLowerCase().trim();
}

function areSimilarDescriptions(desc1: string | null, desc2: string | null): boolean {
  const n1 = normalizeDescription(desc1);
  const n2 = normalizeDescription(desc2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function findDuplicates(expenses: Expense[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < expenses.length; i++) {
    if (processedIds.has(expenses[i].id)) continue;

    const current = expenses[i];
    const matches: Expense[] = [current];

    for (let j = i + 1; j < expenses.length; j++) {
      if (processedIds.has(expenses[j].id)) continue;

      const candidate = expenses[j];

      // Must be same property
      if (current.property_id !== candidate.property_id) continue;

      // Must be same amount
      if (current.amount !== candidate.amount) continue;

      const daysDiff = getDaysDifference(current.date, candidate.date);
      const sameDate = daysDiff === 0;
      const withinTwoDays = daysDiff <= 2;
      const similarDesc = areSimilarDescriptions(current.description, candidate.description);

      // High confidence: exact match on all 3 (same date, same amount, similar description)
      // Medium confidence: same amount + property within 2 days
      if (sameDate && similarDesc) {
        matches.push(candidate);
      } else if (withinTwoDays) {
        matches.push(candidate);
      }
    }

    if (matches.length > 1) {
      // Mark all as processed
      matches.forEach(m => processedIds.add(m.id));

      // Determine confidence
      const allSameDate = matches.every(m => getDaysDifference(m.date, matches[0].date) === 0);
      const allSimilarDesc = matches.every(m => areSimilarDescriptions(m.description, matches[0].description));

      const confidence: 'high' | 'medium' = allSameDate && allSimilarDesc ? 'high' : 'medium';
      const reason = confidence === 'high'
        ? 'Exact match: same amount, date, and similar description'
        : 'Same amount and property within 2 days';

      groups.push({
        id: `dup-${groups.length + 1}`,
        expenses: matches,
        confidence,
        reason,
      });
    }
  }

  return groups;
}
