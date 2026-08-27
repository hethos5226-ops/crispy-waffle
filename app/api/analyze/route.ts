import { NextRequest, NextResponse } from "next/server";
import { analyzeQuery } from "@/lib/analyze";

/**
 * Demonstrates the data-layer boundary: this handler only knows about
 * `analyzeQuery`, which in turn only knows about `ProductProvider`. Pointing
 * that provider at real product/pricing/review APIs later requires no
 * change here.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const analysis = await analyzeQuery(query);

  if (!analysis) {
    return NextResponse.json({ error: "No matching product found" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
