import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
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
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/dKqGhiVvDbWjCuzb.png"
          alt="Exterior Experts"
          className="h-10 w-10 rounded-lg object-contain shrink-0 bg-white p-0.5"
        />
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
    <div className="flex h-screen bg-background overflow-hidden">
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
