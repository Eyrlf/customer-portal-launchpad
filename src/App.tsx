
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import SalesPage from "./pages/SalesPage";
import CustomerDetailsPage from "./pages/CustomerDetailsPage";
import SaleDetailsPage from "./pages/SaleDetailsPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const AppWithDarkMode = () => {
  // Apply dark mode class from localStorage on app load
  useEffect(() => {
    const checkDarkMode = () => {
      try {
        // Try to get user settings from localStorage
        const userInfo = localStorage.getItem("sb-supabase-auth-token");
        if (userInfo) {
          const userId = JSON.parse(userInfo)[0]?.user?.id;
          
          if (userId) {
            const userSettings = localStorage.getItem(`user_settings_${userId}`);
            if (userSettings) {
              const settings = JSON.parse(userSettings);
              if (settings.darkMode) {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
              return;
            }
          }
        }
        
        // If no settings found, use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (error) {
        console.error("Error checking dark mode:", error);
      }
    };
    
    checkDarkMode();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="app-container min-h-screen">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/users" element={<UsersPage />} />
                <Route path="/dashboard/customers" element={<CustomersPage />} />
                <Route path="/dashboard/customers/:custno" element={<CustomerDetailsPage />} />
                <Route path="/dashboard/sales" element={<SalesPage />} />
                <Route path="/dashboard/sales/:transno" element={<SaleDetailsPage />} />
                <Route path="/dashboard/activity-logs" element={<ActivityLogsPage />} />
                <Route path="/dashboard/notifications" element={<NotificationsPage />} />
                <Route path="/dashboard/profile" element={<ProfilePage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
                <Route path="/dashboard/help" element={<HelpPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default AppWithDarkMode;
