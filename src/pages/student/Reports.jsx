import React, { useEffect, useMemo, useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { getMonthlyStats } from "../../lib/api";
import { formatPercent } from "../../lib/formatters";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { downloadCSV } from "../../utils/csv";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const monthValueToDate = (monthValue) => new Date(`${monthValue}-01T00:00:00`);

const StudentReports = () => {
  const { student } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!student?.id) {
        setCurrent(null);
        setPrevious(null);
        return;
      }

      const currentDate = monthValueToDate(selectedMonth);
      const previousDate = addMonths(currentDate, -1);

      const [{ data: currentData }, { data: previousData }] = await Promise.all([
        getMonthlyStats({ month: format(currentDate, "yyyy-MM-dd") }),
        getMonthlyStats({ month: format(previousDate, "yyyy-MM-dd") })
      ]);

      setCurrent(currentData?.[0] || null);
      setPrevious(previousData?.[0] || null);
    };

    load();
  }, [selectedMonth, student?.id]);

  const delta = useMemo(() => {
    const currentPercent = Number(current?.attendance_percentage || 0);
    const previousPercent = Number(previous?.attendance_percentage || 0);
    return currentPercent - previousPercent;
  }, [current, previous]);

  const exportMonth = async () => {
    if (!student?.id) return;
    setExporting(true);
    const currentDate = monthValueToDate(selectedMonth);
    const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("attendance")
      .select("date,status,marked_by,marked_at")
      .eq("student_id", student.id)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    if (!error && data?.length) {
      downloadCSV(
        `my-attendance-${selectedMonth}.csv`,
        data.map((row) => ({
          date: row.date,
          status: row.status,
          marked_by: row.marked_by || "Admin",
          marked_at: row.marked_at || ""
        }))
      );
    }

    setExporting(false);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="My Reports"
        subtitle="Monthly attendance breakdown and export."
        actions={<Button onClick={exportMonth}>{exporting ? "Exporting..." : "Export CSV"}</Button>}
      />

      <Card>
        <label className="text-sm text-slate-300">Select month</label>
        <input
          className="input-field mt-2 max-w-[220px]"
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-widest text-slate-400">Present Days</p>
          <p className="text-3xl font-semibold text-white mt-2">
            {current?.present_days ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-slate-400">Absent Days</p>
          <p className="text-3xl font-semibold text-white mt-2">
            {current?.absent_days ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-slate-400">Attendance %</p>
          <p className="text-3xl font-semibold text-white mt-2">
            {formatPercent(current?.attendance_percentage ?? 0)}
          </p>
          <p className={`text-sm mt-2 ${delta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}% vs previous month
          </p>
        </Card>
      </div>
    </div>
  );
};

export default StudentReports;
