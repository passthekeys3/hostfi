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

function sameCategory(a: Expense, b: Expense): boolean {
  if (!a.category || !b.category) return false;
  return a.category === b.category;
}

/** Stable ID based on the expense IDs in the group (survives reorder) */
function stableGroupId(expenseIds: string[]): string {
  return 'dup-' + [...expenseIds].sort().join('-').slice(0, 40);
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

      // Must be same date for a match
      if (current.date !== candidate.date) continue;

      // High confidence: same date + same amount + similar description OR same category
      const similarDesc = areSimilarDescriptions(current.description, candidate.description);
      const sameCat = sameCategory(current, candidate);

      if (similarDesc || sameCat) {
        matches.push(candidate);
      }
    }

    if (matches.length > 1) {
      matches.forEach(m => processedIds.add(m.id));

      const allSimilarDesc = matches.every(m => areSimilarDescriptions(m.description, matches[0].description));

      groups.push({
        id: stableGroupId(matches.map(m => m.id)),
        expenses: matches,
        confidence: allSimilarDesc ? 'high' : 'medium',
        reason: allSimilarDesc
          ? 'Same amount, date, property, and similar description'
          : 'Same amount, date, property, and category',
      });
    }
  }

  return groups;
}
