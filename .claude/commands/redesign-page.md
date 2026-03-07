# Redesign CRM List Page

Redesign the specified CRM list page to follow the established modern design pattern for this project.

## Design Pattern to Apply

### Page header
- Simple `h1` title (text-xl font-bold) + subtitle with count and optional total
- Primary action button (e.g. "New X") aligned right

### Main container
- Single `bg-card border border-border rounded-xl overflow-hidden` wrapper — no separate header card

### Status tab bar
- Tabs flush to the top of the card, `border-b border-border`, `overflow-x-auto` for mobile
- Each tab: `flex-col`, shows label on top, `count · $total` below in smaller text
- Active tab: `border-b-2 border-primary text-primary bg-primary/5`, `-mb-px` trick for border overlap
- Inactive tab: `border-transparent text-muted-foreground hover:bg-muted/50`

### Search bar
- Below the tabs, `px-4 py-3 border-b border-border bg-muted/20`
- Input: `h-8 text-sm bg-card`, max-w-sm with search icon

### List rows (NOT cards)
- `divide-y divide-border` container
- Each row: `flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group`
- Left: rounded-lg icon `h-9 w-9` with status-matched bg + icon color
- Center: bold title line + secondary info line (customer, address, date) in `text-xs text-muted-foreground`
- Right: bold amount, optional inline action button (opacity-0 group-hover:opacity-100)
- Far right: `ChevronRight` that darkens on group hover

### Date grouping
- Group rows by date (scheduledDate or createdAt)
- Date header: `px-5 py-2 bg-muted/30 border-b border-border`, text `text-xs font-semibold text-muted-foreground uppercase tracking-wide`

### Status badges
- `inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`
- Colors: amber=needs_scheduling/draft, blue=sent/scheduled, indigo=in_progress, emerald=accepted/completed, purple=invoiced, red=declined/cancelled

### Empty state
- Centered icon `text-muted-foreground/20`, message, context-aware subtext, CTA button

### Loading skeleton
- `divide-y divide-border` with icon placeholder + two line placeholders per row

## Status Tab Configuration by Page

| Page | Tabs |
|------|------|
| Quotes | All, Draft, Sent, Accepted, Declined, Expired |
| Jobs | All, Needs Scheduling, Scheduled, In Progress, Completed, Invoiced |
| Invoices | All, Draft, Sent, Overdue, Paid |
| Clients | All (no status tabs — use search + filter row instead) |
| Leads | All, New, Contacted, Quoted, Won, Lost |

## Implementation Steps

1. Read the current page file
2. Read the tRPC router for that resource to understand available query params
3. Rewrite the page following the pattern above
4. Run `npx tsc --noEmit` to verify no type errors

## Usage

```
/redesign-page Invoices
/redesign-page Clients
/redesign-page Leads
```

The argument is the page name. If no argument is given, ask which page to redesign.
