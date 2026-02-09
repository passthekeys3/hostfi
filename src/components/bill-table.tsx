import { Bill, UtilityAccount, Property } from "@/lib/types";
import { cn, formatCurrency, formatDate, getStatusColor, getUtilityIcon } from "@/lib/utils";
import { Receipt } from "lucide-react";

interface BillTableProps {
  bills: (Bill & { utility_account?: UtilityAccount & { property?: Property } })[];
  showProperty?: boolean;
  compact?: boolean;
}

export function BillTable({ bills, showProperty = true, compact = false }: BillTableProps) {
  if (bills.length === 0) {
    return (
      <div 
        className="bg-white rounded-2xl p-12 text-center border border-gray-200"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-foreground">No bills found</p>
        <p className="text-sm text-muted-foreground mt-1.5">Bills will appear here once added.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div 
        className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-200"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Provider</th>
              {showProperty && <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Property</th>}
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Amount</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Due Date</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill, index) => (
              <tr 
                key={bill.id} 
                className={cn(
                  "group transition-colors duration-150 hover:bg-gray-50/60",
                  index !== bills.length - 1 && "border-b border-gray-100"
                )}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:bg-gray-200">
                      {(() => { const UtilIcon = getUtilityIcon(bill.utility_account?.utility_type || 'other'); return <UtilIcon className="w-4 h-4 text-muted-foreground" />; })()}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{bill.utility_account?.provider_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{bill.utility_account?.utility_type || ''}</p>
                    </div>
                  </div>
                </td>
                {showProperty && (
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">{bill.utility_account?.property?.name || '—'}</p>
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  <p className="font-semibold text-sm tabular-nums">{formatCurrency(bill.amount)}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-muted-foreground">{formatDate(bill.due_date)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full capitalize transition-colors",
                    getStatusColor(bill.status)
                  )}>
                    {bill.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="lg:hidden space-y-3">
        {bills.map((bill) => (
          <div 
            key={bill.id} 
            className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-200 active:scale-[0.99]"
            style={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                {(() => { const UtilIcon = getUtilityIcon(bill.utility_account?.utility_type || 'other'); return <UtilIcon className="w-5 h-5 text-muted-foreground" />; })()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{bill.utility_account?.provider_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {bill.utility_account?.utility_type || ''}{showProperty && bill.utility_account?.property?.name ? ` · ${bill.utility_account.property.name}` : ''} · {formatDate(bill.due_date)}
                </p>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className="font-semibold text-sm tabular-nums">{formatCurrency(bill.amount)}</p>
                <span className={cn(
                  "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1",
                  getStatusColor(bill.status)
                )}>
                  {bill.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
