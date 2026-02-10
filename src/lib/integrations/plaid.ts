/**
 * Plaid integration for HostFi
 * - Link token creation (frontend widget initialization)
 * - Public token exchange (after user completes Link)
 * - Transaction sync (recurring pull)
 * - Webhook handling (real-time updates)
 * - Item management (update mode, error recovery)
 */

// Plaid API base URLs
const PLAID_ENVS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
} as const;

type PlaidEnv = keyof typeof PLAID_ENVS;

function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV || 'sandbox') as PlaidEnv;

  if (!clientId || !secret) {
    return null; // Demo mode
  }

  return { clientId, secret, baseUrl: PLAID_ENVS[env], env };
}

async function plaidRequest(endpoint: string, body: Record<string, unknown>) {
  const config = getPlaidConfig();
  if (!config) throw new Error('Plaid not configured');

  const res = await fetch(`${config.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      secret: config.secret,
      ...body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_message: res.statusText }));
    throw new PlaidError(
      err.error_code || 'UNKNOWN',
      err.error_message || 'Plaid API error',
      err.error_type || 'API_ERROR',
      res.status
    );
  }

  return res.json();
}

export class PlaidError extends Error {
  constructor(
    public code: string,
    message: string,
    public type: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'PlaidError';
  }
}

// ──────────────────────────────────────────────
// Link Token (initialize Plaid Link widget)
// ──────────────────────────────────────────────

export interface CreateLinkTokenParams {
  userId: string;
  accessToken?: string; // For update mode (re-auth broken connections)
  redirectUri?: string; // Required for OAuth on mobile
}

export async function createLinkToken(params: CreateLinkTokenParams): Promise<{
  link_token: string;
  expiration: string;
}> {
  const body: Record<string, unknown> = {
    user: { client_user_id: params.userId },
    client_name: 'HostFi',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
    webhook: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/api/integrations/plaid/webhook`,
  };

  if (params.accessToken) {
    // Update mode — don't pass products
    delete body.products;
    body.access_token = params.accessToken;
  }

  if (params.redirectUri) {
    body.redirect_uri = params.redirectUri;
  }

  return plaidRequest('/link/token/create', body);
}

// ──────────────────────────────────────────────
// Token Exchange (after user completes Link)
// ──────────────────────────────────────────────

export async function exchangePublicToken(publicToken: string): Promise<{
  access_token: string;
  item_id: string;
}> {
  return plaidRequest('/item/public_token/exchange', {
    public_token: publicToken,
  });
}

// ──────────────────────────────────────────────
// Transactions Sync (incremental)
// ──────────────────────────────────────────────

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number; // Positive = money spent, negative = money received
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  personal_finance_category: {
    primary: string;
    detailed: string;
  } | null;
  pending: boolean;
  payment_channel: string;
  iso_currency_code: string | null;
}

export interface TransactionsSyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  has_more: boolean;
  next_cursor: string;
  accounts: Array<{
    account_id: string;
    name: string;
    official_name: string | null;
    type: string;
    subtype: string | null;
    mask: string | null;
    balances: {
      current: number | null;
      available: number | null;
    };
  }>;
}

export async function syncTransactions(
  accessToken: string,
  cursor?: string
): Promise<TransactionsSyncResult> {
  const body: Record<string, unknown> = { access_token: accessToken };
  if (cursor) body.cursor = cursor;

  return plaidRequest('/transactions/sync', body);
}

/**
 * Fetch all transactions since last cursor (handles pagination)
 */
export async function fetchAllTransactions(
  accessToken: string,
  cursor?: string
): Promise<{
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  nextCursor: string;
  accounts: TransactionsSyncResult['accounts'];
}> {
  const allAdded: PlaidTransaction[] = [];
  const allModified: PlaidTransaction[] = [];
  const allRemoved: Array<{ transaction_id: string }> = [];
  let currentCursor = cursor;
  let accounts: TransactionsSyncResult['accounts'] = [];

  let hasMore = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Safety limit

  while (hasMore && iterations < MAX_ITERATIONS) {
    const result = await syncTransactions(accessToken, currentCursor);
    allAdded.push(...result.added);
    allModified.push(...result.modified);
    allRemoved.push(...result.removed);
    accounts = result.accounts;
    currentCursor = result.next_cursor;
    hasMore = result.has_more;
    iterations++;
  }

  return {
    added: allAdded,
    modified: allModified,
    removed: allRemoved,
    nextCursor: currentCursor || '',
    accounts,
  };
}

// ──────────────────────────────────────────────
// Item Management
// ──────────────────────────────────────────────

export async function getItem(accessToken: string): Promise<{
  item: {
    item_id: string;
    institution_id: string;
    error: { error_code: string; error_message: string } | null;
    consent_expiration_time: string | null;
  };
  status: {
    transactions: { last_successful_update: string | null };
  };
}> {
  return plaidRequest('/item/get', { access_token: accessToken });
}

export async function removeItem(accessToken: string): Promise<void> {
  await plaidRequest('/item/remove', { access_token: accessToken });
}

// ──────────────────────────────────────────────
// Account & Institution Info
// ──────────────────────────────────────────────

export async function getAccounts(accessToken: string): Promise<{
  accounts: Array<{
    account_id: string;
    name: string;
    official_name: string | null;
    type: string;
    subtype: string | null;
    mask: string | null;
    balances: {
      current: number | null;
      available: number | null;
    };
  }>;
}> {
  return plaidRequest('/accounts/get', { access_token: accessToken });
}

export async function getInstitution(institutionId: string): Promise<{
  institution: {
    institution_id: string;
    name: string;
    url: string | null;
    logo: string | null;
    primary_color: string | null;
  };
}> {
  return plaidRequest('/institutions/get_by_id', {
    institution_id: institutionId,
    country_codes: ['US'],
  });
}

// ──────────────────────────────────────────────
// Category Mapping (Plaid → HostFi)
// ──────────────────────────────────────────────

const PLAID_TO_HOSTFI_CATEGORY: Record<string, string> = {
  // Plaid personal_finance_category.primary → HostFi category
  'RENT_AND_UTILITIES': 'utility',
  'HOME_IMPROVEMENT': 'improvement',
  'GENERAL_SERVICES': 'maintenance',
  'LOAN_PAYMENTS': 'mortgage',
  'INSURANCE': 'insurance',
  'TAX': 'taxes',
  'GENERAL_MERCHANDISE': 'supplies',
  'TRAVEL': 'other',
  'FOOD_AND_DRINK': 'supplies',
  'ENTERTAINMENT': 'other',
  'PERSONAL_CARE': 'other',
  'TRANSPORTATION': 'other',
  'TRANSFER_IN': 'other',
  'TRANSFER_OUT': 'other',
  'BANK_FEES': 'other',
};

/**
 * Map a Plaid transaction to a HostFi expense category
 */
export function mapPlaidCategory(transaction: PlaidTransaction): string {
  if (transaction.personal_finance_category?.primary) {
    return PLAID_TO_HOSTFI_CATEGORY[transaction.personal_finance_category.primary] || 'other';
  }

  // Fallback: legacy category array
  if (transaction.category?.length) {
    const primary = transaction.category[0].toLowerCase();
    if (primary.includes('utilities') || primary.includes('electric') || primary.includes('gas') || primary.includes('water')) return 'utility';
    if (primary.includes('insurance')) return 'insurance';
    if (primary.includes('tax')) return 'taxes';
    if (primary.includes('home') || primary.includes('hardware')) return 'maintenance';
    if (primary.includes('service')) return 'cleaning';
  }

  return 'other';
}

/**
 * Check if Plaid is configured (not demo mode)
 */
export function isPlaidConfigured(): boolean {
  return getPlaidConfig() !== null;
}

/**
 * Get demo transactions for sandbox/demo mode
 */
export function getDemoTransactions(): PlaidTransaction[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const ago = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return fmt(d);
  };

  return [
    { transaction_id: 'demo_1', account_id: 'acc_1', amount: 245.00, date: ago(2), name: 'SoCalGas', merchant_name: 'Southern California Gas', category: ['Utilities', 'Gas'], personal_finance_category: { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_2', account_id: 'acc_1', amount: 189.50, date: ago(5), name: 'LADWP', merchant_name: 'LA Dept of Water and Power', category: ['Utilities', 'Water'], personal_finance_category: { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_WATER' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_3', account_id: 'acc_1', amount: 87.42, date: ago(7), name: 'The Home Depot', merchant_name: 'The Home Depot', category: ['Shops', 'Hardware Store'], personal_finance_category: { primary: 'HOME_IMPROVEMENT', detailed: 'HOME_IMPROVEMENT_HARDWARE' }, pending: false, payment_channel: 'in store', iso_currency_code: 'USD' },
    { transaction_id: 'demo_4', account_id: 'acc_1', amount: 150.00, date: ago(10), name: 'Sparkle Clean Services', merchant_name: 'Sparkle Clean Services', category: ['Service', 'Cleaning'], personal_finance_category: { primary: 'GENERAL_SERVICES', detailed: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_5', account_id: 'acc_1', amount: 2450.00, date: ago(1), name: 'Rent Payment', merchant_name: null, category: ['Transfer', 'Debit'], personal_finance_category: { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_RENT' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_6', account_id: 'acc_1', amount: 134.20, date: ago(3), name: 'SoCalEdison', merchant_name: 'Southern California Edison', category: ['Utilities', 'Electric'], personal_finance_category: { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_7', account_id: 'acc_1', amount: -1850.00, date: ago(4), name: 'Airbnb Payout', merchant_name: 'Airbnb', category: ['Transfer', 'Credit'], personal_finance_category: { primary: 'TRANSFER_IN', detailed: 'TRANSFER_IN_ACCOUNT_TRANSFER' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
    { transaction_id: 'demo_8', account_id: 'acc_1', amount: 45.99, date: ago(8), name: 'Amazon', merchant_name: 'Amazon', category: ['Shops', 'Online Marketplaces'], personal_finance_category: { primary: 'GENERAL_MERCHANDISE', detailed: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES' }, pending: false, payment_channel: 'online', iso_currency_code: 'USD' },
  ];
}
