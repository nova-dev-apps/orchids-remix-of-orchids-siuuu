import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { NovaLogoSvg } from "@/components/NovaLogoSvg";
import { validateLogin, isValidEmail } from "@/lib/authStorage";
import { saveAuthState, isAuthenticated, getLastRoute, clearLastRoute } from "@/lib/authPersistence";
import { signInWithGoogle } from "@/lib/googleAuth";
import { toast } from "sonner";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      const lastRoute = getLastRoute() || '/ai';
      clearLastRoute();
      navigate(lastRoute, { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await validateLogin(email, password);
      
      if (result.success) {
        saveAuthState(email, result.isAdmin);
        
        if (result.isAdmin) {
          toast.success("Welcome back, Admin!");
        } else {
          toast.success("Login successful!");
        }
        
        const lastRoute = getLastRoute() || '/ai';
        clearLastRoute();
        navigate(lastRoute);
      } else {
        toast.error(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(false);
      if (result.error) {
        toast.error(result.error);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Failed to initiate Google login");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <NovaLogoSvg className="h-12 w-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Welcome back!
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Enter your credentials to access your account
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-12 border-border focus:border-nova-pink transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="h-12 border-border focus:border-nova-pink transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-nova-pink hover:text-nova-coral transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              variant="nova"
              size="lg"
              className="w-full h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-full border-border hover:bg-muted/50 transition-all flex items-center justify-center gap-3"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Log in with Google
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-nova-pink hover:text-nova-coral transition-colors font-medium"
              >
                Sign up
              </Link>
            </div>

            <div className="flex justify-center gap-4 pt-4 border-t border-border">
              <Link
                to="/terms"
                className="text-xs text-muted-foreground hover:text-nova-pink transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                to="/privacy"
                className="text-xs text-muted-foreground hover:text-nova-pink transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
