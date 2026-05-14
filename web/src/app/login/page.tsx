"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Calendar, CheckCircle2 } from "lucide-react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Values) {
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-stretch overflow-hidden bg-white">
      {/* Left side: Branding & Features */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-12 lg:flex">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black blur-3xl"></div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Calendar className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">MeetSlot</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight text-white">
            Simplify your scheduling <br />
            <span className="text-white/60">Experience the future of meetings.</span>
          </h2>
          <div className="mt-8 space-y-4">
            {[
              "Multi-tenant Workspace Management",
              "Instant Calendar Synchronization",
              "Automated Email Reminders",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80">
                <CheckCircle2 className="h-5 w-5 text-white/40" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/40">
          © {new Date().getFullYear()} MeetSlot Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-24">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-500">
              Please enter your details to sign in to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    placeholder="name@company.com"
                    className={`pl-10 ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={`pl-10 ${errors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                    {...register("password")}
                  />
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
            </div>

            <Button
              className="group w-full py-6 text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting && (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

