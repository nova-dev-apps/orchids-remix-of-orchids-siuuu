import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { NovaLogoSvg } from "@/components/NovaLogoSvg";
import { validateSignupEmail, isAdminCredentials, isValidEmail, savePendingUser } from "@/lib/authStorage";
import { signInWithGoogle } from "@/lib/googleAuth";
import { toast } from "sonner";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter a password.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!termsChecked) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (isAdminCredentials(email, password)) {
      toast.error("This email is reserved. Please use a different email.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await validateSignupEmail(email);
      if (!result.success) {
        toast.error(result.error || "This email is already registered.");
        return;
      }
      const saveResult = await savePendingUser(email, password);
      if (!saveResult.success) {
        toast.error(saveResult.error || "Failed to save account.");
        return;
      }
      sessionStorage.setItem("pendingEmail", email.toLowerCase().trim());
      sessionStorage.setItem("pendingPassword", password);
      sessionStorage.setItem("pendingSignup", "true");
      toast.success("Please complete payment to create your account.");
      navigate("/subscription");
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!termsChecked) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(true);
      if (result.error) {
        toast.error(result.error);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google signup error:", err);
      toast.error("Failed to initiate Google signup");
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
            <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
            <div className="text-sm text-muted-foreground mt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-nova-pink hover:text-nova-coral transition-colors font-medium">
                Sign in
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 border-border focus:border-nova-pink transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 border-border focus:border-nova-pink transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                className="mt-1"
                checked={termsChecked}
                onCheckedChange={(checked) => setTermsChecked(checked as boolean)}
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-nova-pink hover:text-nova-coral transition-colors underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy-policy" target="_blank" className="text-nova-pink hover:text-nova-coral transition-colors underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              onClick={handleSignup}
              disabled={isLoading}
              variant="nova"
              size="lg"
              className="w-full h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all"
              data-testid="button-signup"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
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
              onClick={handleGoogleSignup}
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
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
