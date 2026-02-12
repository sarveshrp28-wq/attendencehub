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

const randomPassword = (length = 14) => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    output += chars[randomIndex];
  }
  return output;
};

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

  const {
    email,
    name,
    class: className,
    register_number,
    phone_number,
    date_of_birth,
    gender,
    initial_password,
    send_welcome_email = true,
    redirectTo: requestedRedirectTo
  } = body;

  if (!email || !name || !className || !register_number || !phone_number || !date_of_birth || !gender) {
    return textResponse("Missing required fields", 400);
  }

  if (typeof email !== "string" || typeof name !== "string") {
    return textResponse("Invalid payload", 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const password =
    typeof initial_password === "string" && initial_password.trim()
      ? initial_password.trim()
      : randomPassword();

  if (!normalizedEmail) {
    return textResponse("Email is required", 400);
  }

  if (password.length < 8) {
    return textResponse("Initial password must be at least 8 characters.", 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: createdUserData, error: createUserError } =
    await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

  if (createUserError || !createdUserData?.user?.id) {
    return textResponse(createUserError?.message || "Failed to create auth user", 400);
  }

  const createdUserId = createdUserData.user.id;
  const { data: inserted, error: insertError } = await adminClient
    .from("students")
    .insert({
      user_id: createdUserId,
      email: normalizedEmail,
      name,
      class: className,
      register_number,
      phone_number,
      date_of_birth,
      gender
    })
    .select("id")
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(createdUserId);
    return textResponse(insertError.message, 400);
  }

  if (send_welcome_email) {
    const redirectTo = resolveRedirectTo(requestedRedirectTo, siteUrl);
    const options = redirectTo ? { redirectTo } : undefined;
    const { error: resetError } = await authClient.auth.resetPasswordForEmail(
      normalizedEmail,
      options
    );

    if (resetError) {
      return jsonResponse({
        studentId: inserted?.id ?? null,
        warning:
          "Student account created, but welcome/reset email could not be sent.",
        generatedPassword:
          typeof initial_password === "string" && initial_password.trim()
            ? null
            : password
      });
    }

    return jsonResponse({
      studentId: inserted?.id ?? null,
      message: "Student account created. Password reset email sent."
    });
  }

  return jsonResponse({
    studentId: inserted?.id ?? null,
    message: "Student account created successfully.",
    generatedPassword:
      typeof initial_password === "string" && initial_password.trim() ? null : password
  });
});
