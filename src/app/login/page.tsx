"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Droplets } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/client/api";
import { homeFor, type Role } from "@/lib/rbac";
import { loginSchema } from "@/lib/schemas";

type V = z.input<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit(async (v) => {
    setError("");
    try {
      const r = await api.post<{ role: Role }>("/api/auth/login", v);
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(r.role));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-7 shadow-xl">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg"><Droplets className="size-7" /></span>
        <h1 className="text-xl font-extrabold">{process.env.NEXT_PUBLIC_APP_NAME || "Car Wash Management"}</h1>
        <p className="text-sm text-muted">Sign in with your account</p>
      </div>
      <Field label="Login / Email" error={errors.login?.message}><Input autoComplete="username" autoFocus {...register("login")} /></Field>
      <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register("password")} /></Field>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand-100 via-bg to-brand-50 p-4 dark:from-brand-900/40 dark:to-bg">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
