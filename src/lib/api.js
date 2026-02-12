import {
  createEphemeralSupabaseClient,
  siteUrl,
  supabase
} from "./supabaseClient";

const isFunctionNotFoundError = (error) =>
  error?.name === "FunctionsHttpError" && Number(error?.context?.status) === 404;

const missingRpcFunctions = new Set();

const isRpcFunctionNotFoundError = (error) => {
  const message = `${error?.message || ""} ${error?.details || ""} ${
    error?.hint || ""
  }`.toLowerCase();
  return (
    error?.code === "PGRST202" ||
    Number(error?.status) === 404 ||
    message.includes("could not find the function")
  );
};

const toDateKey = (value) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthRange = (monthValue) => {
  const parsed = monthValue ? new Date(monthValue) : new Date();
  const baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const endExclusive = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    1
  );
  return {
    start: toDateKey(start),
    endExclusive: toDateKey(endExclusive)
  };
};

const calculateAttendanceStats = (records = []) => {
  const total_days = records.length;
  const present_days = records.filter((record) => record.status === "Present").length;
  const absent_days = records.filter((record) => record.status === "Absent").length;
  const attendance_percentage = total_days
    ? Number(((present_days / total_days) * 100).toFixed(2))
    : 0;

  return {
    total_days,
    present_days,
    absent_days,
    attendance_percentage
  };
};

const getAuthenticatedUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { userId: null, error };
  }
  return { userId: data?.user?.id || null, error: null };
};

const getStudentByUserId = async (userId) => {
  if (!userId) {
    return { student: null, error: null };
  }

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return { student: data || null, error: error || null };
};

const getAttendanceByStudentId = async ({ studentId, start, endExclusive }) => {
  if (!studentId) {
    return { data: [], error: null };
  }

  let query = supabase.from("attendance").select("status").eq("student_id", studentId);
  if (start) {
    query = query.gte("date", start);
  }
  if (endExclusive) {
    query = query.lt("date", endExclusive);
  }

  return query;
};

const getMyStatsFallback = async () => {
  const { userId, error: userError } = await getAuthenticatedUserId();
  if (userError) {
    return { data: null, error: userError };
  }
  if (!userId) {
    return { data: [], error: null };
  }

  const { student, error: studentError } = await getStudentByUserId(userId);
  if (studentError) {
    return { data: null, error: studentError };
  }
  if (!student?.id) {
    return { data: [], error: null };
  }

  const { data: attendanceRows, error: attendanceError } = await getAttendanceByStudentId(
    {
      studentId: student.id
    }
  );
  if (attendanceError) {
    return { data: null, error: attendanceError };
  }

  return {
    data: [
      {
        student_id: student.id,
        user_id: student.user_id,
        email: student.email,
        name: student.name,
        class: student.class,
        register_number: student.register_number,
        phone_number: student.phone_number,
        date_of_birth: student.date_of_birth,
        gender: student.gender,
        ...calculateAttendanceStats(attendanceRows || [])
      }
    ],
    error: null
  };
};

const getMonthlyStatsFallback = async ({ userId, month }) => {
  let targetUserId = userId || null;

  if (!targetUserId) {
    const { userId: authUserId, error: userError } = await getAuthenticatedUserId();
    if (userError) {
      return { data: null, error: userError };
    }
    targetUserId = authUserId;
  }

  if (!targetUserId) {
    return {
      data: [{ total_days: 0, present_days: 0, absent_days: 0, attendance_percentage: 0 }],
      error: null
    };
  }

  const { student, error: studentError } = await getStudentByUserId(targetUserId);
  if (studentError) {
    return { data: null, error: studentError };
  }
  if (!student?.id) {
    return {
      data: [{ total_days: 0, present_days: 0, absent_days: 0, attendance_percentage: 0 }],
      error: null
    };
  }

  const { start, endExclusive } = getMonthRange(month);
  const { data: attendanceRows, error: attendanceError } = await getAttendanceByStudentId(
    {
      studentId: student.id,
      start,
      endExclusive
    }
  );
  if (attendanceError) {
    return { data: null, error: attendanceError };
  }

  return {
    data: [calculateAttendanceStats(attendanceRows || [])],
    error: null
  };
};

const callRpcWithFallback = async ({ rpcName, payload, fallback }) => {
  if (missingRpcFunctions.has(rpcName)) {
    return fallback();
  }

  const response = await supabase.rpc(rpcName, payload);
  if (!response.error) {
    return response;
  }

  if (isRpcFunctionNotFoundError(response.error)) {
    missingRpcFunctions.add(rpcName);
    return fallback();
  }

  return response;
};

const resolveFunctionErrorMessage = async (error, fallbackMessage) => {
  if (!error) return fallbackMessage;

  if (
    error.message &&
    error.message !== "Edge Function returned a non-2xx status code"
  ) {
    return error.message;
  }

  try {
    const text = await error?.context?.text?.();
    if (!text) return fallbackMessage;

    try {
      const parsed = JSON.parse(text);
      return parsed?.message || fallbackMessage;
    } catch (_parseError) {
      return text;
    }
  } catch (_readError) {
    return fallbackMessage;
  }
};

const invokeFunction = async (functionName, body) => {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (!error) {
    return { data, error: null };
  }

  const status = Number(error?.context?.status || 0);
  const defaultMessage =
    status === 404
      ? `Edge function '${functionName}' is not deployed in this Supabase project.`
      : "Edge function request failed.";

  return {
    data: null,
    error: {
      name: error.name || "FunctionsHttpError",
      status,
      message: await resolveFunctionErrorMessage(error, defaultMessage)
    }
  };
};

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

const createStudentFallback = async (payload) => {
  const {
    email,
    name,
    class: className,
    register_number,
    phone_number,
    date_of_birth,
    gender,
    initial_password,
    send_welcome_email = true
  } = payload;

  if (
    !email ||
    !name ||
    !className ||
    !register_number ||
    !phone_number ||
    !date_of_birth ||
    !gender
  ) {
    return {
      data: null,
      error: { message: "Missing required fields." }
    };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const password = initial_password?.trim() || randomPassword();
  const authClient = createEphemeralSupabaseClient();

  const { data: signupData, error: signupError } = await authClient.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name }
    }
  });

  if (signupError) {
    return { data: null, error: signupError };
  }

  const { error: insertError } = await supabase.from("students").insert({
    user_id: signupData?.user?.id ?? null,
    email: normalizedEmail,
    name,
    class: className,
    register_number,
    phone_number,
    date_of_birth,
    gender
  });

  if (insertError) {
    return { data: null, error: insertError };
  }

  const redirectTo = `${siteUrl}/reset-password`;
  if (send_welcome_email) {
    const { error: resetError } = await authClient.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );
    if (resetError) {
      return {
        data: {
          warning:
            "Student account created in fallback mode, but welcome/reset email could not be sent.",
          generatedPassword: initial_password ? null : password
        },
        error: null
      };
    }
  }

  return {
    data: {
      warning:
        "Edge function 'create-student' is missing. Student account was created in fallback mode.",
      generatedPassword: !send_welcome_email && !initial_password ? password : null
    },
    error: null
  };
};

const deleteStudentFallback = async ({ studentId }) => {
  if (!studentId) {
    return { data: null, error: { message: "studentId is required." } };
  }

  const { data, error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      rows: data || [],
      warning:
        "Edge function 'delete-student' is missing. Student profile was deleted, but auth user cleanup was skipped."
    },
    error: null
  };
};

const sendPasswordResetFallback = async ({ email }) => {
  if (!email) {
    return { data: null, error: { message: "email is required." } };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
    redirectTo: `${siteUrl}/reset-password`
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      success: true,
      warning:
        "Edge function 'send-password-reset' is missing. Reset email was sent using client fallback."
    },
    error: null
  };
};

export const listStudents = async () =>
  supabase.from("students").select("*").order("created_at", { ascending: false });

export const getStudentById = async (id) =>
  supabase.from("students").select("*").eq("id", id).single();

export const createStudent = async (payload) => {
  const response = await invokeFunction("create-student", payload);
  if (!isFunctionNotFoundError(response.error)) {
    return response;
  }
  return createStudentFallback(payload);
};

export const deleteStudent = async ({ studentId, userId }) => {
  const response = await invokeFunction("delete-student", { studentId, userId });
  if (!isFunctionNotFoundError(response.error)) {
    return response;
  }
  return deleteStudentFallback({ studentId });
};

export const sendPasswordReset = async ({ email, userId }) => {
  const response = await invokeFunction("send-password-reset", {
    email,
    userId,
    redirectTo: `${siteUrl}/reset-password`
  });
  if (!isFunctionNotFoundError(response.error)) {
    return response;
  }
  return sendPasswordResetFallback({ email });
};

export const updateStudent = async (id, payload) =>
  supabase.from("students").update(payload).eq("id", id);

export const listAttendanceForDate = async (date) =>
  supabase
    .from("attendance")
    .select("*, students(name, class)")
    .eq("date", date);

export const upsertAttendance = async (records) =>
  supabase
    .from("attendance")
    .upsert(records, { onConflict: "student_id,date" });

export const listAttendanceHistory = async ({
  fromDate,
  toDate,
  className,
  status
}) => {
  let query = supabase
    .from("attendance")
    .select("*, students(name, class)")
    .order("date", { ascending: false });

  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  if (status) query = query.eq("status", status);
  if (className) query = query.eq("students.class", className);

  return query;
};

export const listStats = async () =>
  supabase.from("student_attendance_stats").select("*");

export const getMyStats = async () =>
  callRpcWithFallback({
    rpcName: "get_my_attendance",
    fallback: getMyStatsFallback
  });

export const getMonthlyStats = async ({ userId, month }) => {
  const payload = { p_month: month };
  if (userId) payload.p_user_id = userId;

  return callRpcWithFallback({
    rpcName: "get_monthly_attendance",
    payload,
    fallback: () => getMonthlyStatsFallback({ userId, month })
  });
};
