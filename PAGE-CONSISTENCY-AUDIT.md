# Page Consistency Audit: Expenses vs Revenue

## BEFORE - Differences Found

### 1. Header Section
| Element | Expenses | Revenue |
|---------|----------|---------|
| Title style | `text-2xl sm:text-3xl font-bold tracking-tight` | `text-xl font-bold text-gray-900` |
| Icon prefix | None | Has teal icon box to left |
| Subtitle | `text-gray-500 mt-1 sm:mt-2 text-sm` | `text-sm text-gray-500` |

### 2. Add Button
| Element | Expenses | Revenue |
|---------|----------|---------|
| Type | Link to `/expenses/new` | Button opens modal |
| Style | `bg-gray-900 text-white rounded-xl min-h-[44px]` | `bg-teal-500 text-white rounded-lg` |
| Text | "Add Expense" / "Add" | "Add Revenue" |

### 3. Search Input Position
| Element | Expenses | Revenue |
|---------|----------|---------|
| Location | Top-level filters row | Inside "All Transactions" card |
| Width | `flex-1 min-w-[200px] max-w-md` | `max-w-md` only |

### 4. Filter Dropdowns
| Element | Expenses | Revenue |
|---------|----------|---------|
| Style | `px-3 py-2 bg-white border-gray-200 rounded-xl text-sm` | `bg-gray-50 rounded-lg text-xs font-medium` + chevron |

### 5. Table Container
| Element | Expenses | Revenue |
|---------|----------|---------|
| Border radius | `rounded-2xl` | `rounded-xl` |
| Border | `border-gray-100` | `border-gray-200` |
| Shadow | `shadow-sm` | `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` |

### 6. Table Header Styles
| Element | Expenses | Revenue |
|---------|----------|---------|
| Font size | `text-[11px]` | `text-xs` |
| Font weight | `font-semibold` | `font-medium` |
| Color | `text-muted-foreground` | `text-gray-500` |
| Background | `bg-gray-50/80` | None |
| Hover | `hover:bg-gray-100/80` | `hover:bg-gray-50` |

### 7. Table Row Styles
| Element | Expenses | Revenue |
|---------|----------|---------|
| Hover | `hover:bg-gray-50/60` | `hover:bg-gray-50/50` |
| Separator | `border-b border-gray-100` on rows | `divide-y divide-gray-50` on tbody |

### 8. Empty State (filtered results)
| Element | Expenses | Revenue |
|---------|----------|---------|
| Icon | Receipt | None |
| Container | `py-16 bg-white rounded-2xl border-gray-100` | `py-12 text-center` (no container) |
| Text color | `text-gray-500 text-sm` | `text-sm text-gray-400` |

### 9. Pagination Position
| Element | Expenses | Revenue |
|---------|----------|---------|
| Location | Outside table, `pt-4` | Inside table, `px-5 py-4 border-t` |
| Text | "expenses" | "bookings" |

### 10. Mobile Cards
| Element | Expenses | Revenue |
|---------|----------|---------|
| Present | Yes (`lg:hidden`) | No |

### 11. Date Formatting
| Element | Expenses | Revenue |
|---------|----------|---------|
| Method | `formatDate(expense.date)` | Inline `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` |

### 12. Edit Modal
| Element | Expenses | Revenue |
|---------|----------|---------|
| Delete button | Left side ✓ | Left side ✓ |
| Cancel/Save | Right side ✓ | Right side ✓ |
| Max width | `sm:max-w-lg` ✓ | `sm:max-w-lg` ✓ |

---

## AFTER - Changes Made

### Revenue Page Updates:

1. **Header Section** → Standardized to match expenses pattern:
   - Title: `text-2xl sm:text-3xl font-bold tracking-tight`
   - Subtitle: `text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed`
   - Kept icon for visual distinction (revenue-specific)

2. **Add Button** → Changed to match expenses style:
   - `bg-gray-900 text-white rounded-xl min-h-[44px]`
   - Import CSV button also uses `rounded-xl`

3. **Search Input** → Moved to top-level filters row (same as expenses)

4. **Filter Dropdowns** → Standardized:
   - `px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm`
   - Removed chevron icons (match expenses simplicity)

5. **Table Container** → Standardized:
   - `rounded-2xl border-gray-100 shadow-sm`

6. **Table Header Styles** → Standardized:
   - `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80`
   - Sortable hover: `hover:bg-gray-100/80`

7. **Table Row Styles** → Standardized:
   - `hover:bg-gray-50/60 cursor-pointer`
   - Row borders: `border-b border-gray-100` (removed divide-y)

8. **Empty State** → Added consistent pattern:
   - Icon (DollarSign for revenue)
   - `py-16 bg-white rounded-2xl border border-gray-100`
   - Text: `text-gray-500 text-sm`

9. **Pagination** → Moved outside table container:
   - `pt-4` spacing
   - Text says "entries" (generic for revenue)

10. **Mobile Cards** → Added for transaction list

11. **Date Formatting** → Changed to use `formatDate()` from utils

---

## Summary

Both pages now share:
- ✅ Identical header typography
- ✅ Identical add button style (gray-900, rounded-xl)
- ✅ Search in top-level filters row
- ✅ Identical filter dropdown styling
- ✅ Identical table container (rounded-2xl, border-gray-100, shadow-sm)
- ✅ Identical table header styling (11px, semibold, bg-gray-50/80)
- ✅ Identical row hover/border patterns
- ✅ Consistent empty state pattern
- ✅ Pagination outside table with consistent styling
- ✅ Mobile cards for both
- ✅ Same date formatting utility
- ✅ Same modal patterns (Delete left, Cancel+Save right)

Revenue-specific sections kept as-is:
- Stat cards (revenue overview)
- Property P&L table
- Revenue by Platform breakdown
- Monthly Summary
- CSV Import flow
