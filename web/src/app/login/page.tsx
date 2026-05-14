"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  async function onSubmit(values: Values) {
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify(values) });
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Log in to MeetSlot</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input placeholder="Email" {...register("email")} />
          <Input type="password" placeholder="Password" {...register("password")} />
          <Button className="w-full" disabled={formState.isSubmitting}>Log in</Button>
        </form>
        <Link className="mt-4 block text-sm text-primary" href="/signup">Create an account</Link>
      </Card>
    </div>
  );
}

