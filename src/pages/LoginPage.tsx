// src/pages/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  TrendingUp,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  BarChart3,
  Package,
} from "lucide-react";

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

const features = [
  { icon: BarChart3, text: "تقارير مبيعات شاملة وتحليلات دقيقة" },
  { icon: Package, text: "إدارة المخزون عبر متعدد المستودعات" },
  { icon: ShieldCheck, text: "صلاحيات متعددة المستويات" },
];

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
    <div className="flex min-h-screen bg-background" dir="rtl">
      {/* ── Right panel: Branding (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-12">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-[-40px] w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 text-center text-white max-w-sm">
          {/* Logo */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl">
            <TrendingUp size={42} className="text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            نظام إدارة المبيعات
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-10">
            حل متكامل لإدارة المبيعات والمخزون والتقارير بكفاءة واحترافية
          </p>

          {/* Feature list */}
          <div className="space-y-4 text-right">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/20">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm text-white/85">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 text-white/40 text-xs">
          © {new Date().getFullYear()} نظام إدارة المبيعات
        </div>
      </div>

      {/* ── Left panel: Login form ── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile header */}
        <div className="mb-8 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <TrendingUp size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">نظام إدارة المبيعات</h1>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold text-foreground">تسجيل الدخول</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              أدخل بياناتك للوصول إلى حسابك
            </p>
          </div>

          {/* Error */}
          {serverError && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription className="text-sm">{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} نظام إدارة المبيعات. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
