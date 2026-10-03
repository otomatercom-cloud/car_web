import { redirect } from "next/navigation";

// Middleware redirects by role; this is the fallback.
export default function Home() {
  redirect("/login");
}
