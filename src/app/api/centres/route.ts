import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  listCentres,
  createCentre,
  centreCodeExists,
} from "@/lib/centres/centre.service";
import {
  createCentreSchema,
  cleanCentreInput,
} from "@/lib/centres/centre.validation";
import type { CreateCentreInput, CentreStatus } from "@/types/centre";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const status: CentreStatus | undefined =
      statusParam === "active" || statusParam === "suspended" || statusParam === "deactivated"
        ? statusParam
        : undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await listCentres({
      status,
      search,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cleaned = cleanCentreInput(body);

    const parsed = createCentreSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input: CreateCentreInput = {
      name: parsed.data.name,
      code: parsed.data.code,
      contact_email: parsed.data.contact_email || undefined,
      contact_phone: parsed.data.contact_phone || undefined,
      address_line1: parsed.data.address_line1 || undefined,
      address_line2: parsed.data.address_line2 || undefined,
      city: parsed.data.city || undefined,
      state: parsed.data.state || undefined,
      postal_code: parsed.data.postal_code || undefined,
      country: parsed.data.country,
      status: parsed.data.status,
    };

    const codeTaken = await centreCodeExists(input.code);
    if (codeTaken) {
      return NextResponse.json(
        { error: "A centre with this code already exists." },
        { status: 409 },
      );
    }

    const centre = await createCentre(input);

    return NextResponse.json({ data: centre }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
