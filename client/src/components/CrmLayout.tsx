import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  Share2,
  Users,
  X,
  Zap,
  Calculator,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Navigation items are defined here with full feature set.
// Stubbed features are filtered out based on feature maturity at render time.
const allNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: Home },
      { label: "Schedule", href: "/admin/schedule", icon: Calendar },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { label: "Quotes", href: "/admin/quotes", icon: FileText },
      { label: "Jobs", href: "/admin/jobs", icon: Building2 },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Clients", href: "/admin/clients", icon: Users },
      { label: "Leads", href: "/admin/leads", icon: Zap },
      { label: "Requests", href: "/admin/requests", icon: ClipboardList },
    ],
  },
  {
    label: "Communications",
    items: [
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
      // STUBBED: Expert Cam — photo documentation module not production-ready
      // { label: "Expert Cam", href: "/admin/expert-cam", icon: Camera },
      {
        label: "Marketing",
        href: "/admin/marketing",
        icon: Megaphone,
        children: [
          // STUBBED: Review automation not integrated; hidden from UI
          // { label: "Reviews", href: "/admin/marketing?tab=reviews" },
          { label: "Campaigns", href: "/admin/marketing?tab=campaigns" },
          { label: "Referrals", href: "/admin/marketing?tab=referrals" },
        ],
      },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Products & Services", href: "/admin/products", icon: Package },
      { label: "Instant Quotes", href: "/admin/quote-tool", icon: Calculator },
      { label: "Booking Controls", href: "/admin/booking-controls", icon: Globe },
      { label: "Standalone Link", href: "/admin/standalone-link", icon: Share2 },
      { label: "Automations", href: "/admin/automations", icon: Zap },
      { label: "AI Receptionist", href: "/admin/ai-receptionist", icon: Bot },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Insights", href: "/admin/insights", icon: BarChart3 },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Use filtered nav groups (stubbed features already commented out above)
const navGroups: NavGroup[] = allNavGroups;

function NavLink({
  item,
  collapsed,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  badge?: number;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive =
    item.href === "/admin"
      ? location === "/admin"
      : location.startsWith(item.href.split("?")[0]);

  if (item.children) {
    const anyChildActive = item.children.some((c) =>
      location.startsWith(c.href.split("?")[0])
    );
    const effectiveOpen = open || anyChildActive;

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            isActive || anyChildActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground/60 hover:bg-muted hover:text-foreground"
          )}
        >
          {(isActive || anyChildActive) && (
            <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" />
          )}
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0",
              isActive || anyChildActive ? "text-primary" : "text-foreground/40"
            )}
          />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-foreground/40",
                  effectiveOpen && "rotate-180"
                )}
              />
            </>
          )}
        </button>
        {!collapsed && effectiveOpen && (
          <div className="ml-[1.625rem] mt-0.5 border-l-2 border-border pl-3 pb-1 space-y-0.5">
            {item.children.map((child) => (
              <Link key={child.href} href={child.href}>
                <span
                  className={cn(
                    "block px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                    location.startsWith(child.href.split("?")[0])
                      ? "text-primary font-medium bg-primary/5"
                      : "text-foreground/55 hover:text-foreground hover:bg-muted"
                  )}
                >
                  {child.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href}>
      <span
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer overflow-hidden",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground/60 hover:bg-muted hover:text-foreground"
        )}
        title={collapsed ? item.label : undefined}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
        )}
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-primary" : "text-foreground/40"
          )}
        />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none shrink-0 font-medium">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function CrmLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: company } = trpc.company.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: smsUnread = 0 } = trpc.sms.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-14 border-b border-border shrink-0",
          collapsed && "justify-center px-3"
        )}
      >
        {company?.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name ?? "Company"}
            className="h-8 w-8 rounded-lg object-contain shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {company?.name ?? "Exterior Experts"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">Admin Portal</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                {group.label}
              </p>
            )}
            {collapsed && (
              <div className="h-px bg-border mx-2 mb-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  badge={
                    item.href === "/admin/messages" && smsUnread > 0
                      ? smsUnread
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* User profile */}
      <div className={cn("px-2 py-3 border-t border-border shrink-0")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors",
                collapsed && "justify-center px-2"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-foreground truncate leading-tight">
                    {user?.name ?? "You"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {user?.email}
                  </p>
                </div>
              )}
              {!collapsed && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f5f6f8] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200 shrink-0 relative",
          collapsed ? "w-[60px]" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-64 h-full bg-card border-r border-border flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-card border-b border-border shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-foreground/60 hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-semibold text-foreground truncate">
              {company?.name ?? "Exterior Experts"}
            </span>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center gap-4 px-6 h-14 bg-card border-b border-border shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm bg-muted/60 border-transparent focus-visible:border-border focus-visible:ring-0 rounded-lg placeholder:text-muted-foreground/60"
              placeholder="Search… ⌘K"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchValue.trim()) {
                  window.location.href = `/admin/clients?search=${encodeURIComponent(searchValue.trim())}`;
                }
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Quick Create */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8 text-xs font-medium">
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/leads")}
                >
                  New Lead
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/quotes/new")}
                >
                  New Quote
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/jobs/new")}
                >
                  New Job
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/invoices/new")}
                >
                  New Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={() => (window.location.href = "/admin/messages")}
              title="Messages"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {smsUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-semibold">
                  {smsUnread > 9 ? "9+" : smsUnread}
                </span>
              )}
            </Button>

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg hover:bg-muted px-2 py-1.5 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user?.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden xl:block">
                    {user?.name?.split(" ")[0] ?? "You"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden xl:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
