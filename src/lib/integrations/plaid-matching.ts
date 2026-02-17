/**
 * Plaid Transaction Matching Engine
 * 
 * Handles intelligent matching of bank transactions to existing expenses,
 * deduplication, revenue detection, and smart categorization.
 */

import type { PlaidTransaction } from './plaid';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface Expense {
  id: string;
  user_id: string;
  property_id: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  date: string;
  plaid_transaction_id: string | null;
  verification_status: string;
  source: string;
}

export interface RecurringRule {
  id: string;
  user_id: string;
  merchant_pattern: string;
  category: string;
  property_id: string | null;
}

export interface MatchResult {
  type: 'confident' | 'possible' | 'none';
  expense: Expense | null;
  score: number;
  needsReview: boolean;
}

export interface RevenueResult {
  isRevenue: boolean;
  platform: string | null;
}

export interface RuleResult {
  category: string;
  property_id: string | null;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

// Default list of personal merchants to ignore
export const DEFAULT_IGNORED_MERCHANTS = [
  'starbucks',
  'mcdonald\'s',
  'uber eats',
  'doordash',
  'netflix',
  'spotify',
  'apple.com',
  'amazon prime',
  'walmart grocery',
  'target',
  'costco',
  'trader joe\'s',
  'whole foods',
  'chipotle',
  'chick-fil-a',
  'dunkin',
  'panera',
  'grubhub',
  'postmates',
  'instacart',
  'hulu',
  'disney+',
  'hbo max',
  'paramount+',
  'peacock',
  'apple music',
  'youtube premium',
  'audible',
];

// Revenue platforms (short-term rental / property management)
const REVENUE_PLATFORMS = [
  { pattern: 'airbnb', platform: 'airbnb' },
  { pattern: 'vrbo', platform: 'vrbo' },
  { pattern: 'homeaway', platform: 'vrbo' },
  { pattern: 'booking.com', platform: 'booking_com' },
  { pattern: 'stripe', platform: 'direct' },
  { pattern: 'guesty', platform: 'other' },
  { pattern: 'hostaway', platform: 'other' },
  { pattern: 'ownerrez', platform: 'other' },
  { pattern: 'lodgify', platform: 'other' },
  { pattern: 'hospitable', platform: 'other' },
  { pattern: 'smartbnb', platform: 'other' },
  { pattern: 'beyond pricing', platform: 'other' },
  { pattern: 'pricelabs', platform: 'other' },
];

// ──────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────

/**
 * Normalize a merchant/vendor name for comparison
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|co|company|corporation)\.?$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Calculate string similarity using simple overlap
 */
function calculateNameSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  
  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) return 0.8;
  
  // Check if they start the same
  const minLen = Math.min(normA.length, normB.length);
  let matchLen = 0;
  for (let i = 0; i < minLen; i++) {
    if (normA[i] === normB[i]) matchLen++;
    else break;
  }
  
  if (matchLen >= 5) return 0.6;
  if (matchLen >= 3) return 0.4;
  
  return 0;
}

/**
 * Calculate date proximity score
 */
function calculateDateScore(txnDate: string, expenseDate: string): number {
  const txn = new Date(txnDate);
  const exp = new Date(expenseDate);
  const diffDays = Math.abs((txn.getTime() - exp.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 1.0;
  if (diffDays <= 1) return 0.9;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.4;
  if (diffDays <= 14) return 0.2;
  return 0;
}

/**
 * Calculate amount match score
 */
function calculateAmountScore(txnAmount: number, expenseAmount: number): number {
  const absA = Math.abs(txnAmount);
  const absB = Math.abs(expenseAmount);
  
  if (absA === absB) return 1.0;
  
  const diff = Math.abs(absA - absB);
  const percentDiff = diff / Math.max(absA, absB);
  
  if (percentDiff <= 0.01) return 0.95; // Within 1%
  if (percentDiff <= 0.05) return 0.7;  // Within 5%
  if (percentDiff <= 0.1) return 0.5;   // Within 10%
  if (percentDiff <= 0.2) return 0.3;   // Within 20%
  
  return 0;
}

// ──────────────────────────────────────────────
// Main Functions
// ──────────────────────────────────────────────

/**
 * Match a Plaid transaction to existing expenses
 * Returns the best match or null if no good match found
 */
export function matchTransactionToExpense(
  transaction: PlaidTransaction,
  existingExpenses: Expense[]
): MatchResult {
  // Skip if we've already processed this transaction
  const alreadyLinked = existingExpenses.find(
    e => e.plaid_transaction_id === transaction.transaction_id
  );
  if (alreadyLinked) {
    return { type: 'none', expense: alreadyLinked, score: 0, needsReview: false };
  }

  // Only match expenses (positive amounts in Plaid)
  if (transaction.amount <= 0) {
    return { type: 'none', expense: null, score: 0, needsReview: false };
  }

  const merchantName = transaction.merchant_name || transaction.name;
  let bestMatch: { expense: Expense; score: number } | null = null;

  for (const expense of existingExpenses) {
    // Skip already linked expenses
    if (expense.plaid_transaction_id) continue;
    
    // Skip if amounts are way off (>50% difference)
    const amountDiff = Math.abs(Math.abs(transaction.amount) - expense.amount) / Math.max(expense.amount, 1);
    if (amountDiff > 0.5) continue;

    // Calculate scores
    const amountScore = calculateAmountScore(transaction.amount, expense.amount);
    const dateScore = calculateDateScore(transaction.date, expense.date);
    const nameScore = calculateNameSimilarity(merchantName, expense.vendor || expense.description || '');

    const totalScore = amountScore + dateScore + nameScore;

    if (!bestMatch || totalScore > bestMatch.score) {
      bestMatch = { expense, score: totalScore };
    }
  }

  if (!bestMatch) {
    return { type: 'none', expense: null, score: 0, needsReview: false };
  }

  // Scoring thresholds
  if (bestMatch.score > 1.5) {
    return { 
      type: 'confident', 
      expense: bestMatch.expense, 
      score: bestMatch.score,
      needsReview: false 
    };
  }
  
  if (bestMatch.score >= 1.0) {
    return { 
      type: 'possible', 
      expense: bestMatch.expense, 
      score: bestMatch.score,
      needsReview: true 
    };
  }

  return { type: 'none', expense: null, score: bestMatch.score, needsReview: false };
}

/**
 * Check if a merchant should be ignored (personal expense)
 */
export function isIgnoredMerchant(
  merchantName: string | null | undefined,
  userIgnoredList: string[] = []
): boolean {
  if (!merchantName) return false;
  
  const normalized = normalizeName(merchantName);
  
  // Check user's custom ignored list
  for (const ignored of userIgnoredList) {
    if (normalizeName(ignored) === normalized) return true;
    if (normalized.includes(normalizeName(ignored))) return true;
  }
  
  // Check default ignored list
  for (const ignored of DEFAULT_IGNORED_MERCHANTS) {
    if (normalized.includes(normalizeName(ignored))) return true;
  }
  
  return false;
}

/**
 * Detect if a transaction is revenue (money coming in)
 * Checks for known STR/rental platforms
 */
export function detectRevenue(transaction: PlaidTransaction): RevenueResult {
  // Revenue = negative amount in Plaid (money coming in)
  if (transaction.amount >= 0) {
    return { isRevenue: false, platform: null };
  }

  const merchantName = (transaction.merchant_name || transaction.name || '').toLowerCase();

  for (const { pattern, platform } of REVENUE_PLATFORMS) {
    if (merchantName.includes(pattern)) {
      return { isRevenue: true, platform };
    }
  }

  // Generic revenue (unknown platform)
  return { isRevenue: true, platform: 'other' };
}

/**
 * Apply recurring rules to categorize a transaction
 */
export function applyRecurringRule(
  transaction: PlaidTransaction,
  rules: RecurringRule[]
): RuleResult | null {
  const merchantName = (transaction.merchant_name || transaction.name || '').toLowerCase();

  for (const rule of rules) {
    const pattern = rule.merchant_pattern.toLowerCase();
    if (merchantName.includes(pattern)) {
      return {
        category: rule.category,
        property_id: rule.property_id,
      };
    }
  }

  return null;
}

/**
 * Handle pending transactions
 * Finds existing expenses that match a pending transaction's settled version
 */
export function findPendingMatch(
  settledTransaction: PlaidTransaction,
  existingExpenses: Expense[]
): Expense | null {
  if (settledTransaction.pending) return null;

  const merchantName = settledTransaction.merchant_name || settledTransaction.name;
  const txnDate = new Date(settledTransaction.date);

  for (const expense of existingExpenses) {
    // Must be a Plaid-sourced expense (likely from when it was pending)
    if (expense.source !== 'plaid') continue;
    if (expense.plaid_transaction_id) continue; // Already linked

    // Check merchant match
    const nameScore = calculateNameSimilarity(merchantName, expense.vendor || expense.description || '');
    if (nameScore < 0.6) continue;

    // Check amount (within 10%)
    const amountScore = calculateAmountScore(settledTransaction.amount, expense.amount);
    if (amountScore < 0.5) continue;

    // Check date (within 5 days for pending → settled)
    const expDate = new Date(expense.date);
    const daysDiff = Math.abs((txnDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 5) continue;

    return expense;
  }

  return null;
}

/**
 * Process a batch of transactions with full matching logic
 */
export interface ProcessedTransaction {
  transaction: PlaidTransaction;
  action: 'skip_ignored' | 'skip_duplicate' | 'matched' | 'created' | 'revenue' | 'pending_update';
  expense_id?: string;
  revenue_id?: string;
  matched_expense?: Expense;
  needs_review?: boolean;
  category?: string;
  property_id?: string | null;
}

export interface ProcessingContext {
  userId: string;
  existingExpenses: Expense[];
  ignoredMerchants: string[];
  recurringRules: RecurringRule[];
  accountMappings: Record<string, string>; // plaid_account_id → property_id
  defaultPropertyId?: string;
}

export function processTransaction(
  transaction: PlaidTransaction,
  context: ProcessingContext
): ProcessedTransaction {
  const merchantName = transaction.merchant_name || transaction.name;

  // 1. Check if ignored merchant
  if (isIgnoredMerchant(merchantName, context.ignoredMerchants)) {
    return { transaction, action: 'skip_ignored' };
  }

  // 2. Check if already processed
  const existing = context.existingExpenses.find(
    e => e.plaid_transaction_id === transaction.transaction_id
  );
  if (existing) {
    return { transaction, action: 'skip_duplicate', expense_id: existing.id };
  }

  // 3. Check if revenue
  const revenueResult = detectRevenue(transaction);
  if (revenueResult.isRevenue) {
    return {
      transaction,
      action: 'revenue',
      property_id: context.accountMappings[transaction.account_id] || context.defaultPropertyId,
    };
  }

  // 4. Apply recurring rules
  const ruleResult = applyRecurringRule(transaction, context.recurringRules);
  const category = ruleResult?.category;
  const rulePropertyId = ruleResult?.property_id;

  // 5. Try to match to existing expense
  const matchResult = matchTransactionToExpense(transaction, context.existingExpenses);

  if (matchResult.type === 'confident' && matchResult.expense) {
    return {
      transaction,
      action: 'matched',
      matched_expense: matchResult.expense,
      expense_id: matchResult.expense.id,
      needs_review: false,
    };
  }

  if (matchResult.type === 'possible' && matchResult.expense) {
    return {
      transaction,
      action: 'matched',
      matched_expense: matchResult.expense,
      expense_id: matchResult.expense.id,
      needs_review: true,
    };
  }

  // 6. Check if this is a settled version of a pending transaction
  if (!transaction.pending) {
    const pendingMatch = findPendingMatch(transaction, context.existingExpenses);
    if (pendingMatch) {
      return {
        transaction,
        action: 'pending_update',
        expense_id: pendingMatch.id,
        matched_expense: pendingMatch,
      };
    }
  }

  // 7. Create new expense
  const propertyId = rulePropertyId 
    || context.accountMappings[transaction.account_id] 
    || context.defaultPropertyId;

  return {
    transaction,
    action: 'created',
    category,
    property_id: propertyId,
  };
}
