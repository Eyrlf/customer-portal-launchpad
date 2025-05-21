
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState("signin");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const handleSignInSuccess = () => {
    toast({
      title: "Welcome back!",
      description: "You've successfully signed in.",
    });
    navigate("/dashboard");
  };

  const handleSignUpSuccess = () => {
    toast({
      title: "Account created!",
      description: "Your account has been successfully created.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-10">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">Customer Management System</h1>
          <p className="text-lg text-white/80 mb-8">
            Streamline your customer relationships with our comprehensive management solution.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white mb-1">500+</div>
              <div className="text-white/70 text-sm">Businesses Trust Us</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <div className="text-white/70 text-sm">Customer Support</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-white/70 text-sm">Uptime Guarantee</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white mb-1">128-bit</div>
              <div className="text-white/70 text-sm">Secure Encryption</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {activeTab === "signin" ? "Sign in to your account" : "Create a new account"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {activeTab === "signin" 
                ? "Enter your credentials to access your dashboard" 
                : "Fill in your details to get started"}
            </p>
          </div>

          <Tabs 
            defaultValue="signin" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <SignInForm onSuccess={handleSignInSuccess} />
            </TabsContent>
            
            <TabsContent value="signup">
              <SignUpForm onSuccess={handleSignUpSuccess} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
