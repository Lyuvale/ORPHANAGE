import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getCentreById,
  updateCentre,
  centreCodeExists,
} from "@/lib/centres/centre.service";
import {
  updateCentreSchema,
  cleanCentreInput,
} from "@/lib/centres/centre.validation";
import type { UpdateCentreInput, CentreStatus } from "@/types/centre";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const centre = await getCentreById(id);

    if (!centre) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    return NextResponse.json({ data: centre });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cleaned = cleanCentreInput(body);

    const parsed = updateCentreSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await getCentreById(id);
    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const status: CentreStatus | undefined =
      parsed.data.status as CentreStatus | undefined;

    const input: UpdateCentreInput = {
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
      status,
    };

    if (input.code) {
      const codeTaken = await centreCodeExists(input.code, id);
      if (codeTaken) {
        return NextResponse.json(
          { error: "A centre with this code already exists." },
          { status: 409 },
        );
      }
    }

    const updated = await updateCentre(id, input);

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await getCentreById(id);

    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const deactivated = await updateCentre(id, { status: "deactivated" });

    return NextResponse.json({ data: deactivated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
