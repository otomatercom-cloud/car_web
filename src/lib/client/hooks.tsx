"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api, qs, ApiError } from "./api";
import type { Dashboard, ListResult, Operations, StaticConfig } from "../types";

export const useStatic = () =>
  useQuery({ queryKey: ["static"], queryFn: () => api.get<StaticConfig>("/api/static"), staleTime: 60_000 });

/** Live board. Polls only while the tab is visible; interval comes from the server (OPERATIONS_REFRESH_INTERVAL). */
export const useOperations = () =>
  useQuery({
    queryKey: ["operations"],
    queryFn: () => api.get<Operations>("/api/operations"),
    refetchInterval: (q) => q.state.data?.refreshMs ?? 5000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

export const useDashboard = (from?: string, to?: string) =>
  useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () => api.get<Dashboard>(`/api/dashboard${qs({ date_from: from, date_to: to })}`),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });

export function useList<T = Record<string, any>>(
  base: string, // "/api/r/customers" or "/api/portal/r/jobs"
  params: Record<string, any>,
  opts: { refetchMs?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["list", base, params],
    queryFn: () => api.get<ListResult<T>>(`${base}${qs(params)}`),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchMs,
    enabled: opts.enabled,
  });
}

export function useGet<T>(key: QueryKey, url: string | null, refetchMs?: number) {
  return useQuery({ queryKey: key, queryFn: () => api.get<T>(url!), enabled: !!url, refetchInterval: refetchMs });
}

/** Mutation with toast + cache invalidation. */
export function useAction<V = void, R = unknown>(
  fn: (v: V) => Promise<R>,
  opts: { success?: string | ((r: R) => string); invalidate?: string[][]; onSuccess?: (r: R, v: V) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      const msg = typeof opts.success === "function" ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      for (const k of opts.invalidate ?? [["operations"], ["list"]]) qc.invalidateQueries({ queryKey: k });
      opts.onSuccess?.(r, v);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong. Please try again."),
  });
}

/** Server-time skew so timers are right even if the device clock is wrong. */
export function useSkew(serverNow?: string) {
  const [skew, setSkew] = useState(0);
  useEffect(() => {
    if (serverNow) setSkew(new Date(serverNow).getTime() - Date.now());
  }, [serverNow]);
  return skew;
}

/** 1-second ticker, only active when `on` is true. */
export function useTick(on = true) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [on]);
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface Me { uid: number; name: string; role: import("../rbac").Role; partnerId: number | null; employeeId: number | null }
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/auth/me"), staleTime: 300_000 });
