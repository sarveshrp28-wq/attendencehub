import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { createStudent } from "../../lib/api";
import { GENDERS } from "../../lib/constants";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const schema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Valid email required").required("Email is required"),
  class: yup.string().required("Class is required"),
  register_number: yup.string().required("Register number is required"),
  phone_number: yup.string().required("Phone number is required"),
  date_of_birth: yup.string().required("Date of birth is required"),
  gender: yup.string().required("Gender is required"),
  initial_password: yup
    .string()
    .trim()
    .test(
      "password-length",
      "Initial password must be at least 8 characters",
      (value) => !value || value.length >= 8
    )
});

const AdminStudentAdd = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema) });

  const initialPassword = watch("initial_password");

  const onSubmit = async (values) => {
    setStatus("");
    setGeneratedPassword("");

    const payload = {
      ...values,
      initial_password: autoGeneratePassword ? "" : values.initial_password?.trim(),
      send_welcome_email: sendWelcomeEmail
    };

    if (!autoGeneratePassword && !payload.initial_password) {
      setStatus("Initial password is required when auto-generate is disabled.");
      return;
    }

    const { data, error } = await createStudent(payload);
    if (error) {
      setStatus(error.message);
      return;
    }

    if (data?.generatedPassword) {
      setGeneratedPassword(data.generatedPassword);
    }

    if (data?.warning) {
      setStatus(data.warning);
    } else if (data?.message) {
      setStatus(data.message);
    } else {
      setStatus("Student created successfully.");
    }

    if (!data?.generatedPassword) {
      setTimeout(() => navigate("/admin/students"), 1200);
    }
  };

  const toggleAutoPassword = (enabled) => {
    setAutoGeneratePassword(enabled);
    if (enabled) {
      setValue("initial_password", "");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Add Student"
        subtitle="Create student login + profile, and optionally send welcome/reset email."
      />

      <Card>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm text-slate-300">Full name</label>
            <input className="input-field mt-2" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-300 mt-1">{errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input className="input-field mt-2" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-rose-300 mt-1">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Class</label>
            <input className="input-field mt-2" {...register("class")} />
            {errors.class ? (
              <p className="text-xs text-rose-300 mt-1">{errors.class.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Register number</label>
            <input className="input-field mt-2" {...register("register_number")} />
            {errors.register_number ? (
              <p className="text-xs text-rose-300 mt-1">
                {errors.register_number.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Phone number</label>
            <input className="input-field mt-2" {...register("phone_number")} />
            {errors.phone_number ? (
              <p className="text-xs text-rose-300 mt-1">
                {errors.phone_number.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Date of birth</label>
            <input
              className="input-field mt-2"
              type="date"
              {...register("date_of_birth")}
            />
            {errors.date_of_birth ? (
              <p className="text-xs text-rose-300 mt-1">
                {errors.date_of_birth.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300">Gender</label>
            <select className="select-field mt-2" {...register("gender")}>
              <option value="">Select</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
            {errors.gender ? (
              <p className="text-xs text-rose-300 mt-1">{errors.gender.message}</p>
            ) : null}
          </div>

          <div className="lg:col-span-2 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={autoGeneratePassword}
                onChange={(event) => toggleAutoPassword(event.target.checked)}
              />
              Auto-generate initial password
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={sendWelcomeEmail}
                onChange={(event) => setSendWelcomeEmail(event.target.checked)}
              />
              Send welcome/reset email
            </label>
          </div>

          {!autoGeneratePassword ? (
            <div className="lg:col-span-2">
              <label className="text-sm text-slate-300">Initial password</label>
              <input
                className="input-field mt-2"
                type="password"
                value={initialPassword || ""}
                {...register("initial_password")}
              />
              {errors.initial_password ? (
                <p className="text-xs text-rose-300 mt-1">
                  {errors.initial_password.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex items-center gap-3">
            <p className="text-sm text-slate-300">
              Student can sign in with this email using password or Google.
            </p>
          </div>

          <div className="lg:col-span-2 flex flex-wrap gap-3 items-center">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create student"}
            </Button>
            {status ? <p className="text-sm text-slate-200">{status}</p> : null}
          </div>

          {generatedPassword ? (
            <div className="lg:col-span-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <p className="text-xs uppercase tracking-widest text-amber-200">
                Temporary Password
              </p>
              <p className="text-sm text-white mt-1 break-all">{generatedPassword}</p>
              <p className="text-xs text-amber-100 mt-2">
                Share this securely and ask the student to change it after first login.
              </p>
            </div>
          ) : null}

          {sendWelcomeEmail ? (
            <p className="lg:col-span-2 text-xs text-slate-400">
              If Supabase email is configured, the student will receive a password reset link.
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
};

export default AdminStudentAdd;
