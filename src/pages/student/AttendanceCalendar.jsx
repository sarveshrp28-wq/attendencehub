import React, { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { supabase } from "../../lib/supabaseClient";
import { buildAttendanceMap } from "../../lib/attendance";
import { useAuth } from "../../context/AuthContext";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";

const getDaysForGrid = (monthDate) => {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfMonth(monthDate);
  const days = [];
  let current = start;
  while (current <= end || days.length % 7 !== 0) {
    days.push(current);
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
};

const statusColor = (status) => {
  if (status === "Present") return "bg-emerald-500/20 text-emerald-200";
  if (status === "Absent") return "bg-rose-500/20 text-rose-200";
  if (status === "Late") return "bg-amber-500/20 text-amber-200";
  if (status === "Excused") return "bg-slate-500/20 text-slate-200";
  return "bg-white/5 text-slate-400";
};

const StudentAttendanceCalendar = () => {
  const { student } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState([]);

  const fetchMonth = async () => {
    if (!student?.id) {
      setAttendance([]);
      return;
    }
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", student.id)
      .gte("date", start)
      .lte("date", end);
    setAttendance(data || []);
  };

  useEffect(() => {
    fetchMonth();
  }, [student?.id, currentMonth]);

  const days = useMemo(() => getDaysForGrid(currentMonth), [currentMonth]);
  const map = useMemo(() => buildAttendanceMap(attendance), [attendance]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Calendar View"
        subtitle="Color-coded attendance at a glance."
        actions={
          <div className="flex gap-2">
            <button
              className="btn-outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              Previous
            </button>
            <button
              className="btn-outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              Next
            </button>
          </div>
        }
      />

      <Card>
        <h3 className="text-lg font-semibold text-white">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="grid grid-cols-7 gap-2 mt-4 text-xs text-slate-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 mt-2">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const status = map.get(key);
            const isCurrentMonth =
              day.getMonth() === currentMonth.getMonth();
            return (
              <div
                key={key}
                className={`rounded-xl p-2 min-h-[70px] flex flex-col ${
                  isCurrentMonth ? "bg-white/5" : "bg-white/5 opacity-60"
                }`}
              >
                <span className="text-xs text-slate-400">{day.getDate()}</span>
                {status ? (
                  <span
                    className={`mt-auto text-[10px] px-2 py-1 rounded-full ${statusColor(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                ) : (
                  <span className="mt-auto text-[10px] text-slate-500">-</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default StudentAttendanceCalendar;
