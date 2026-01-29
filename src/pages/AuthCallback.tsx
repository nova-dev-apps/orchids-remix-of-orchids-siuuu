import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { NovaLogoSvg } from "@/components/NovaLogoSvg";
import { handleGoogleCallback } from "@/lib/googleAuth";
import { saveAuthState } from "@/lib/authPersistence";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processCallback = async () => {
      const isSignup = searchParams.get('signup') === 'true';
      
      try {
        const result = await handleGoogleCallback(isSignup);
        
        if (result.success) {
          if (result.email) {
            saveAuthState(result.email, result.isAdmin || false);
            sessionStorage.setItem("userEmail", result.email);
            sessionStorage.setItem("isAdmin", result.isAdmin ? "true" : "false");
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem("authProvider", "google");
          }

          if (result.isPendingPayment && !result.isAdmin) {
            if (result.email) {
              sessionStorage.setItem("pendingEmail", result.email);
              sessionStorage.setItem("pendingSignup", "true");
            }
            toast.success("Please complete payment to activate your account.");
            navigate("/subscription", { replace: true });
          } else {
            toast.success(result.isAdmin ? "Welcome back, Admin!" : "Login successful!");
            navigate("/ai", { replace: true });
          }
        } else {
          if (result.isPendingPayment && result.email) {
            sessionStorage.setItem("pendingEmail", result.email);
            sessionStorage.setItem("pendingSignup", "true");
            toast.info(result.error || "Please complete payment to access.");
            navigate("/subscription", { replace: true });
          } else {
            setStatus('error');
            setErrorMessage(result.error || "Authentication failed");
            toast.error(result.error || "Authentication failed");
            
            setTimeout(() => {
              navigate(isSignup ? "/signup" : "/login", { replace: true });
            }, 3000);
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        setErrorMessage("An unexpected error occurred");
        toast.error("An unexpected error occurred");
        
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <NovaLogoSvg className="h-12 w-auto" />
        </div>
        
        {status === 'processing' ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-nova-pink mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Processing your login...
            </h2>
            <p className="text-muted-foreground text-sm">
              Please wait while we verify your account
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Error
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {errorMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting you back...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
