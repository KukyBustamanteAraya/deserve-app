import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from '@/lib/logger';
import {
  createSupabaseRouteClient,
  jsonWithCarriedCookies,
} from "@/lib/supabase/route";

const PasswordPayload = z.object({
  newPassword: z.string().min(8),
  nonce: z.string().optional(),
});

const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  const { supabase, response: carrier } = createSupabaseRouteClient(req);

  // Parse and validate request body
  let payload: z.infer<typeof PasswordPayload>;
  try {
    payload = PasswordPayload.parse(await req.json());
  } catch (e) {
    logger.error("[password] Bad payload", e);
    return jsonWithCarriedCookies(carrier, { error: "Invalid payload" }, { status: 400 });
  }

  const { newPassword, nonce } = payload;

  // Validate password complexity
  if (!complexity.test(newPassword)) {
    return jsonWithCarriedCookies(
      carrier,
      {
        error: "Password must be at least 8 chars and include upper, lower, and a digit.",
        code: "weak_password",
      },
      { status: 400 }
    );
  }

  // Get the current user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    logger.error("[password] getUser error:", userErr);
    return jsonWithCarriedCookies(
      carrier,
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const user = userData.user;

  // Check if user has an email identity
  const hasEmailIdentity = (user.identities ?? []).some((i) => i.provider === "email");
  if (!hasEmailIdentity) {
    return jsonWithCarriedCookies(
      carrier,
      {
        error: "This account has no email/password identity. Link an email first.",
        code: "no_email_identity",
      },
      { status: 400 }
    );
  }

  // Update password
  const { data: updated, error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
    ...(nonce ? { nonce } : {}),
  });

  if (updateErr) {
    logger.error("[password] updateUser error:", {
      code: (updateErr as any)?.code,
      message: updateErr.message,
      status: (updateErr as any)?.status,
    });

    const status = (updateErr as any)?.status ?? 400;
    if (status === 412 || /reauthentication/i.test(updateErr.message)) {
      return jsonWithCarriedCookies(
        carrier,
        { error: "reauthentication_needed", code: "reauthentication_needed" },
        { status: 412 }
      );
    }

    return jsonWithCarriedCookies(
      carrier,
      { error: updateErr.message, code: (updateErr as any)?.code },
      { status }
    );
  }

  // Optional: mark metadata for analytics
  await supabase.auth.updateUser({
    data: { password_set: true, password_updated_at: new Date().toISOString() },
  });

  return jsonWithCarriedCookies(
    carrier,
    { ok: true, user: { id: updated?.user?.id } },
    { status: 200 }
  );
}