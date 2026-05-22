import { NextRequest, NextResponse } from "next/server";
import { processBatch } from "@/server/lib/output";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  try {
    const buffer = await file.arrayBuffer();
    const result = processBatch(buffer);

    return new NextResponse(result as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="result.xlsx"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
