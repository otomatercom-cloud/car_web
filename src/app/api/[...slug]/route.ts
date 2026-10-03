import type { NextRequest } from "next/server";
import { dispatch } from "@/lib/server/router";
import { routes } from "@/lib/server/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type P = { params: Promise<{ slug: string[] }> };
const handle = async (req: NextRequest, { params }: P) => dispatch(req, (await params).slug, routes);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
