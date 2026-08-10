// src/pages/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Auth
import authService from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
  username: z.string().min(1, { message: "اسم المستخدم مطلوب" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading, handleLoginSuccess } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!isAuthLoading && user) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthLoading, user, location.state, navigate]);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setServerError(null);
    try {
      const authResponse = await authService.login(data);
      handleLoginSuccess(authResponse);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      const errorMsg = authService.getErrorMessage(
        err,
        "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى."
      );
      toast.error(errorMsg);
      setServerError(errorMsg);
    }
  };

  if (isAuthLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-6"
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        {/* Logo & heading */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.jpeg"
            alt="شعار النظام"
            className="mb-4 h-24 w-24 rounded-xl object-contain"
          />
          <h1 className="text-xl font-bold text-foreground">
            نظام إدارة المبيعات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجّل الدخول للمتابعة
          </p>
        </div>

        {/* Error */}
        {serverError && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription className="text-sm">{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium">
              اسم المستخدم
            </Label>
            <div className="relative">
              <User
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                className="pr-9 h-11"
                disabled={isSubmitting}
                {...register("username")}
                aria-invalid={!!errors.username}
              />
            </div>
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              كلمة المرور
            </Label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-9 pl-10 h-11"
                disabled={isSubmitting}
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold mt-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin ml-2" />
                جاري التحقق...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} نظام إدارة المبيعات. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
