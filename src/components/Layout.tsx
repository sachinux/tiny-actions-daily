import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Inbox, CheckSquare, Calendar, TrendingUp, LogOut, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "See you soon!",
    });
    navigate("/auth");
  };

  const navItems = [
    { icon: Target, label: "Today", path: "/today" },
    { icon: Inbox, label: "Inbox", path: "/inbox" },
    { icon: CheckSquare, label: "Clarify", path: "/clarify" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: TrendingUp, label: "Progress", path: "/progress" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <nav className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-colors",
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-foreground">TinyActions</h1>
          <p className="text-sm text-muted-foreground mt-1">Build your life, daily</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
