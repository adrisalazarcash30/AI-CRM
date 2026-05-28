import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const { dealId, stage } = await req.json();
  if (!dealId || !stage) {
    return NextResponse.json({ error: "Missing dealId or stage" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("deals")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", dealId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal: data });
}
