
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
}

const ProfilePage = () => {
  const { isAuthenticated, isLoading, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: user.email || "",
      });
    }
  }, [profile, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Refresh profile data
      await refreshProfile();
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          <h1 className="text-3xl font-bold mb-6">My Profile</h1>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid gap-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input 
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input 
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
};

export default ProfilePage;
