
import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, Package, ShoppingCart, Bell, FileText,
  Settings, LogOut, ChevronDown, Menu, X, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationCount {
  count: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch unread notification count only for admin users
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchNotificationCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setNotificationCount(count);
      }
    };

    fetchNotificationCount();

    // Subscribe to changes in notifications table
    const subscription = supabase
      .channel('notification_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotificationCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const getInitials = () => {
    if (profile?.first_name || profile?.last_name) {
      const first = profile.first_name?.[0] || '';
      const last = profile.last_name?.[0] || '';
      return (first + last).toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || '';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || '';
  };

  const menuItems = [
    {
      icon: <Package size={20} />,
      label: "Dashboard",
      path: "/dashboard",
      visible: true,
    },
    {
      icon: <Users size={20} />,
      label: "Users",
      path: "/dashboard/users",
      visible: isAdmin,
    },
    {
      icon: <Users size={20} />,
      label: "Customers",
      path: "/dashboard/customers",
      visible: true,
    },
    {
      icon: <ShoppingCart size={20} />,
      label: "Sales",
      path: "/dashboard/sales",
      visible: true,
    },
    {
      icon: <FileText size={20} />,
      label: "Activity Logs",
      path: "/dashboard/activity-logs",
      visible: isAdmin,
    },
    {
      icon: <HelpCircle size={20} />,
      label: "Help & Support",
      path: "/dashboard/help",
      visible: true,
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      path: "/dashboard/settings",
      visible: true,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 z-40 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-gray-600"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-md transition-transform duration-300 ease-in-out lg:static lg:block`}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b">
            <h2 className="text-2xl font-bold text-primary">CMS</h2>
          </div>

          <nav className="flex-grow py-4">
            <ul className="space-y-1 px-3">
              {menuItems
                .filter(item => item.visible)
                .map((item, index) => (
                  <li key={index}>
                    <Button
                      variant={location.pathname === item.path ? "secondary" : "ghost"}
                      className={`w-full justify-start text-left text-sm ${
                        location.pathname === item.path ? "font-medium" : ""
                      }`}
                      onClick={() => {
                        navigate(item.path);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Button>
                  </li>
                ))}
            </ul>
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-left text-red-500"
              onClick={handleLogout}
            >
              <LogOut size={20} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white shadow">
          <div className="flex items-center justify-end px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* Only show notification button for admin users */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard/notifications')}
                  className="relative"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt="Profile" />
                        ) : (
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="ml-2 hidden md:inline-block">
                        {getDisplayName()}
                      </span>
                    </div>
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
