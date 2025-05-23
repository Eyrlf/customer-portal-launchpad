import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  darkMode: boolean;
}

// Default settings with light mode as default
const defaultSettings: UserSettings = {
  darkMode: false,
};

const SettingsPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    // Load settings from localStorage if available
    if (user) {
      const savedSettings = localStorage.getItem(`user_settings_${user.id}`);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings({
            darkMode: parsedSettings.darkMode !== undefined ? parsedSettings.darkMode : false
          });
        } catch (e) {
          console.error("Failed to parse settings:", e);
        }
      }
    }
  }, [user]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    
    // Save to localStorage
    if (user) {
      localStorage.setItem(`user_settings_${user.id}`, JSON.stringify(settings));
    }
    
    // Apply dark mode if needed
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Show success toast
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
    
    setIsSaving(false);
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setSettings({...settings, darkMode: checked});
    
    // Apply dark mode immediately for better user experience
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Settings</h1>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Appearance</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Customize the look and feel of the application.</p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="dark-mode" 
                    checked={settings.darkMode}
                    onCheckedChange={handleDarkModeToggle}
                  />
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
};

export default SettingsPage;
