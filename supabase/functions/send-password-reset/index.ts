/// <reference types="https://deno.land/x/types/index.d.ts" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

const textResponse = (message: string, status: number) =>
  new Response(message, { status, headers: corsHeaders });

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const resolveRedirectTo = (requested: unknown, siteUrl: string) => {
  if (typeof requested === "string" && requested.trim()) {
    return requested.trim();
  }
  if (!siteUrl) {
    return undefined;
  }
  return `${siteUrl.replace(/\/$/, "")}/reset-password`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").trim();
  const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "attendencehub@gmail.com").toLowerCase();

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return textResponse("Missing required Supabase env configuration", 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();

  if (authError || !authData?.user || authData.user.email?.toLowerCase() !== adminEmail) {
    return textResponse("Unauthorized", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_parseError) {
    return textResponse("Invalid JSON body", 400);
  }

  const { email, userId, redirectTo: requestedRedirectTo } = body;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let targetEmail = "";
  if (typeof email === "string" && email.trim()) {
    targetEmail = normalizeEmail(email);
  } else if (typeof userId === "string" && userId.trim()) {
    const { data: userData, error: lookupError } = await adminClient.auth.admin.getUserById(
      userId
    );
    if (lookupError) {
      return textResponse(lookupError.message, 400);
    }
    if (userData?.user?.email) {
      targetEmail = normalizeEmail(userData.user.email);
    }
  } else {
    return textResponse("email or userId is required", 400);
  }

  if (!targetEmail) {
    return textResponse("Could not resolve target email.", 404);
  }

  const redirectTo = resolveRedirectTo(requestedRedirectTo, siteUrl);
  const options = redirectTo ? { redirectTo } : undefined;
  const { error: resetError } = await authClient.auth.resetPasswordForEmail(
    targetEmail,
    options
  );

  if (resetError) {
    return textResponse(resetError.message, 400);
  }

  return jsonResponse({
    success: true,
    message: "Password reset email sent."
  });
});
