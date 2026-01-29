import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, is_verified, is_subscribed')
        .eq('email', normalizedEmail)
        .single();

      if (userError || !existingUser) {
        toast({
          title: "Error",
          description: "No account found with this email address",
        });
        setIsLoading(false);
        return;
      }

      if (!existingUser.is_verified || !existingUser.is_subscribed) {
        toast({
          title: "Error",
          description: "This account has not completed payment yet",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) {
        console.error('OTP error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to send reset code. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      toast({
        title: "Code sent!",
        description: "Check your email for the 6-digit code",
      });
    } catch (err) {
      console.error('Reset password error:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    if (resetCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: resetCode,
        type: 'email',
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast({
          title: "Error",
          description: "Invalid or expired code. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Code verified!",
        description: "Redirecting to reset password",
      });

      setTimeout(() => {
        navigate("/reset-password", { 
          state: { 
            email: normalizedEmail, 
            verified: true,
            session: data.session 
          } 
        });
      }, 1000);
    } catch (err) {
      console.error('Verify code error:', err);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to resend code",
        });
      } else {
        toast({
          title: "Code resent!",
          description: "Check your email for the new code",
        });
        setResetCode("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardHeader className="text-center pb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              {isSubmitted ? "Check your email" : "Reset password"}
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              {isSubmitted
                ? "We've sent a 6-digit code to your email"
                : "Enter your email and we'll send you a reset code"}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isSubmitted ? (
              <form onSubmit={handleResetPassword} className="space-y-6">
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
                    className="h-12 border-border focus:border-nova-pink transition-colors"
                    disabled={isLoading}
                  />
                </div>

                  <Button
                    type="submit"
                    variant="nova"
                    size="lg"
                    className="w-full h-12 rounded-full"
                    disabled={isLoading}
                  >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send code"
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Back to login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="reset-code"
                      className="text-sm font-medium text-foreground"
                    >
                      Reset Code
                    </Label>
                    <Input
                      id="reset-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      className="h-12 border-border focus:border-nova-pink transition-colors text-center text-lg tracking-widest"
                      maxLength={6}
                      disabled={isLoading}
                    />
                  </div>

                    <Button
                      variant="nova"
                      size="lg"
                      className="w-full h-12 rounded-full"
                      onClick={handleConfirmCode}
                      disabled={resetCode.length !== 6 || isLoading}
                    >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Confirm code"
                    )}
                  </Button>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code? Check your spam folder or
                  </p>
                    <Button
                      onClick={handleResendCode}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 rounded-full"
                      disabled={isLoading}
                    >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      "Resend code"
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Back to login
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
