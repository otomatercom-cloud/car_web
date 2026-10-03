// Shapes returned by the aggregated Odoo API (see otm_carwash/models/api.py).
export type Role = "manager" | "reception" | "operator" | "customer";

export interface Ref { id: number; name: string }

export interface JobCard {
  id: number; name: string; token: number; state: JobState; priority: string;
  vehicle: { id: number; reg_no: string; type: string; brand: string; model: string; color: string };
  customer: { id: number; name: string; mobile: string };
  services: string[]; estimated_minutes: number;
  arrival_dt: string | null; assigned_dt: string | null; start_dt: string | null; end_dt: string | null;
  work_seconds: number; last_resume_dt: string | null; wait_minutes: number;
  bay: Ref | null; staff: string[]; assigned_staff: Ref[]; actual_staff: Ref[]; assign_reason: string; qc_passed: boolean;
  amount_total: number; paid_amount: number; balance: number; payment_state: string;
  queue_position: number | null; eligible_bays: number[]; eta?: string;
  // detail only
  server_now?: string; lines?: { service: string; price: number; duration: number }[];
  subtotal?: number; discount?: number; invoice?: string | null; notes?: string; qc_notes?: string;
  delivered_dt?: string | null; feedback?: boolean;
  payments?: { id: number; amount: number; method: string; kind: string; reference: string | false; dt: string; received_by: string }[];
  inspections?: Inspection[];
  audit?: { id: number; action: string; detail: string | false; actor: string; dt: string }[];
}

export interface Inspection {
  id: number; kind: "before" | "after"; damage_notes: string; customer_notes: string; accessories: string;
  staff_confirmed: boolean; customer_confirmed: boolean; photos: Record<"front" | "rear" | "left" | "right", boolean>;
}

export type JobState = "queued" | "assigned" | "washing" | "paused" | "quality_check" | "ready" | "completed" | "cancelled";
export type BayState = "available" | "reserved" | "busy" | "cleaning" | "maintenance" | "offline";

export interface BayView { id: number; name: string; number: number; state: BayState; active: boolean; staff: string[]; job: JobCard | null }

export interface Metrics {
  vehicles_today: number; revenue_today: number; washing: number; waiting: number; ready: number;
  available_bays: number; total_bays: number; avg_wait_today: number; avg_wash_minutes: number;
  current_avg_wait: number; max_wait: number; longest_waiting: string | null;
  over_warn: number; over_critical: number; warn_min: number; critical_min: number;
}

export interface Operations {
  server_now: string; today: string; bays: BayView[]; queue: JobCard[]; ready: JobCard[]; quality: JobCard[]; metrics: Metrics;
  refreshMs?: number;
}

export interface Dashboard {
  operations: Operations; revenue_vs_yesterday: number | null;
  revenue_trend: { date: string; value: number }[]; vehicle_trend: { date: string; value: number }[];
  wait_trend: { date: string; value: number }[];
  service_popularity: { name: string; count: number; revenue: number }[];
  vehicle_types: { name: string; count: number }[];
  bay_utilization: { bay: string; number: number; busy_minutes: number; utilization: number }[];
  staff_productivity: StaffPerf[];
}

export interface StaffPerf {
  id: number; name: string; role: string; available: boolean; vehicles_completed: number; services_completed: number;
  total_work_minutes: number; avg_job_minutes: number; avg_wait_minutes: number; revenue: number;
  jobs_per_day: number; jobs_per_hour: number;
}

export interface StaticConfig {
  vehicle_types: { id: number; name: string; code: string }[];
  services: { id: number; name: string; code: string; duration: number }[];
  pricing: { service_id: number; vehicle_type_id: number; customer_type: string; price: number }[];
  bays: { id: number; name: string; number: number; vehicle_type_ids: Ref[]; service_ids: Ref[]; staff_ids: Ref[] }[];
  staff: { id: number; name: string; otm_cw_role: string; otm_cw_shift: string | false; otm_cw_available: boolean }[];
  packages: { id: number; name: string; price: number; validity_days: number; lines: { service_id: number; service: string; qty: number }[] }[];
  settings: Record<string, string>;
  refreshMs?: number;
}

export interface Quote {
  lines: { service_id: number; name: string; price: number; source: string; duration: number }[];
  subtotal: number; discount: number; total: number; minutes: number; missing: string[];
}

export interface ListResult<T = Record<string, any>> { items: T[]; total: number; offset: number; limit: number }
