import { EmptyState } from "@/components/empty-state";
import { 
  LayoutDashboard, 
  Building2, 
  Receipt, 
  Inbox, 
  BarChart3, 
  FileText, 
  Calculator 
} from "lucide-react";

export default function EmptyDemoPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Empty States Demo</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Preview all empty state components in one place
        </p>
      </div>

      <div className="grid gap-6">
        {/* Dashboard Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dashboard</p>
          </div>
          <EmptyState
            icon={LayoutDashboard}
            title="Welcome to HostFi!"
            description="Add your first property to get started."
            actionLabel="Add Property"
            actionHref="/dashboard/properties/new"
          />
        </div>

        {/* Properties Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</p>
          </div>
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Add your first property to start tracking expenses."
            actionLabel="Add Property"
            actionHref="/dashboard/properties/new"
          />
        </div>

        {/* Expenses Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</p>
          </div>
          <EmptyState
            icon={Receipt}
            title="No expenses tracked yet"
            description="Add an expense or set up email parsing to get started."
            actionLabel="Add Expense"
            actionHref="/dashboard/expenses/new"
          />
        </div>

        {/* Inbox Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbox</p>
          </div>
          <EmptyState
            icon={Inbox}
            title="Your inbox is empty"
            description="Set up your billing email to start receiving bills automatically."
            actionLabel="Set Up Email"
            actionHref="/dashboard/settings"
          />
        </div>

        {/* Analytics Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analytics</p>
          </div>
          <EmptyState
            icon={BarChart3}
            title="Not enough data yet"
            description="Add at least one month of expenses to see analytics."
          />
        </div>

        {/* Reports Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reports</p>
          </div>
          <EmptyState
            icon={FileText}
            title="No reports available yet"
            description="Reports generate automatically after your first month of data."
          />
        </div>

        {/* Tax Prep Empty State */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Prep</p>
          </div>
          <EmptyState
            icon={Calculator}
            title="No expenses to map"
            description="Add expenses to see your Schedule E breakdown."
            actionLabel="Add Expense"
            actionHref="/dashboard/expenses/new"
          />
        </div>
      </div>
    </div>
  );
}
