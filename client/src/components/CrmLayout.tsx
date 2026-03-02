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
  ClipboardList,
  FileText,
  Globe,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  Share2,
  Users,
  X,
  Zap,
  Calculator,
} from "lucide-react";
import { ReactNode, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: "Home", href: "/admin", icon: Home },
  { label: "Schedule", href: "/admin/schedule", icon: Calendar },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Leads", href: "/admin/leads", icon: Zap },
  { label: "Requests", href: "/admin/requests", icon: ClipboardList },
  { label: "Quotes", href: "/admin/quotes", icon: FileText },
  { label: "Jobs", href: "/admin/jobs", icon: Building2 },
  { label: "Expert Cam", href: "/admin/expert-cam", icon: Camera },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "Invoices", href: "/admin/invoices", icon: FileText },
  {
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
    children: [
      { label: "Reviews", href: "/admin/marketing?tab=reviews" },
      { label: "Campaigns", href: "/admin/marketing?tab=campaigns" },
      { label: "Referrals", href: "/admin/marketing?tab=referrals" },
    ],
  },
  { label: "Products & Services", href: "/admin/products", icon: Package },
  { label: "Instant Quotes", href: "/admin/quote-tool", icon: Calculator },
  { label: "Booking Controls", href: "/admin/booking-controls", icon: Globe },
  { label: "Standalone Link", href: "/admin/standalone-link", icon: Share2 },
  { label: "Automations", href: "/admin/automations", icon: Zap },
  { label: "AI Receptionist", href: "/admin/ai-receptionist", icon: Bot },
  { label: "Insights", href: "/admin/insights", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function NavLink({ item, collapsed, badge }: { item: NavItem; collapsed: boolean; badge?: number }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive =
    item.href === "/admin"
      ? location === "/admin"
      : location.startsWith(item.href.split("?")[0]);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-7 mt-1 space-y-1">
            {item.children.map((child) => (
              <Link key={child.href} href={child.href}>
                <span className="block px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 cursor-pointer transition-colors">
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
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {badge !== undefined && (
          <span className="ml-auto bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none shrink-0">
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
  const { data: company } = trpc.company.get.useQuery(undefined, { enabled: isAuthenticated });
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        {company?.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name ?? "Company"}
            className="h-10 w-10 rounded-lg object-contain shrink-0 bg-white p-0.5"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {company?.name ?? "Exterior Experts"}
            </p>
            <p className="text-xs text-sidebar-foreground/50">CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            badge={item.href === "/admin/messages" && smsUnread > 0 ? smsUnread : undefined}
          />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {user?.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
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
    <div className="flex h-screen bg-gradient-to-br from-[#f7f9fc] via-[#eef2f8] to-[#e6ecf5] dark:from-background dark:via-background dark:to-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full bg-sidebar border border-sidebar-border rounded-r-md p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors z-10"
          style={{ left: collapsed ? "3.5rem" : "14.5rem" }}
        >
          <Menu className="h-3 w-3" />
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-sidebar flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <button onClick={() => setMobileOpen(true)} className="text-sidebar-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sidebar-primary" />
            <span className="text-sm font-semibold text-sidebar-foreground">
              {company?.name ?? "Exterior Experts"}
            </span>
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b bg-white/90 backdrop-blur-md border-muted">
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-sm font-semibold text-muted-foreground">Workspace</span>
            <Badge variant="outline" className="text-xs">Live</Badge>
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-full max-w-xl">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 pr-3 h-10 bg-muted/60 border-border focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="Search leads, clients, quotes… (Ctrl/Cmd + K)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchValue.trim()) {
                    window.location.href = `/admin/clients?search=${encodeURIComponent(searchValue.trim())}`;
                  }
                }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Quick Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => (window.location.href = "/admin/leads")}>
                  New Lead
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = "/admin/quotes/new")}>
                  New Quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = "/admin/jobs/new")}>
                  New Job
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = "/admin/invoices/new")}>
                  New Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => window.location.href = "/admin/messages"}
              title="Messages"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {smsUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">
                  {smsUnread > 9 ? "9+" : smsUnread}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-lg border bg-white shadow-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-semibold text-foreground">{user?.name ?? "You"}</p>
                    <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
