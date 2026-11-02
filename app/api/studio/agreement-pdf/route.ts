import { NextResponse, type NextRequest } from "next/server";

import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import { buildAgreementPdf } from "@/lib/practitioners/agreementPdf";
import { getAgreement } from "@/lib/practitioners/agreements";
import { ownPractitionerProfile } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SIGNED_URL_SECONDS = 60;

/**
 * Agreement PDFs (Handover 66 §5.3), signed-in studio members only.
 *
 *   ?version=V               the published text, rendered on request
 *                            (a super admin can also preview a draft)
 *   ?version=V&copy=signed   your own signed copy from the private bucket,
 *                            through a 60-second signed URL; a super admin
 *                            may add &practitioner=<id> to open anyone's
 *
 * The private bucket is never linked directly, and nothing here is ever
 * attached to an email.
 */
export async function GET(request: NextRequest) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const version = request.nextUrl.searchParams.get("version") ?? "";
  const agreement = version ? await getAgreement(version) : null;
  if (!agreement) return NextResponse.json({ error: "No such agreement." }, { status: 404 });

  if (request.nextUrl.searchParams.get("copy") === "signed") {
    const asked = request.nextUrl.searchParams.get("practitioner");
    let practitionerId: string | null;
    if (asked) {
      if (!member.isSuperAdmin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      practitionerId = asked;
    } else {
      practitionerId = (await ownPractitionerProfile(user.id))?.id ?? null;
    }
    if (!practitionerId) return NextResponse.json({ error: "No practitioner profile." }, { status: 404 });

    const admin = createAdminSupabaseClient();
    const { data: acc } = await admin
      .from("practitioner_agreement_acceptances")
      .select("pdf_path")
      .eq("practitioner_id", practitionerId)
      .eq("agreement_version", version)
      .maybeSingle();
    if (!acc?.pdf_path) return NextResponse.json({ error: "No signed copy on file." }, { status: 404 });
    const { data, error } = await admin.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(acc.pdf_path, SIGNED_URL_SECONDS, { download: `${version}-signed.pdf` });
    if (error || !data) return NextResponse.json({ error: "Could not open the file." }, { status: 500 });
    const res = NextResponse.redirect(data.signedUrl, 303);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (!agreement.published && !member.isSuperAdmin) return NextResponse.json({ error: "No such agreement." }, { status: 404 });
  const pdf = await buildAgreementPdf({
    title: agreement.title,
    version: agreement.version,
    body: agreement.body,
    sha256: agreement.body_sha256,
    effectiveFrom: agreement.effective_from,
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${agreement.version}${agreement.published ? "" : "-draft"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
