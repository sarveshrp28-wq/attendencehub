import React, { useEffect, useMemo, useState } from "react";
import { format, lastDayOfMonth, parseISO } from "date-fns";
import { supabase } from "../../lib/supabaseClient";
import { formatDate } from "../../lib/formatters";
import { useAuth } from "../../context/AuthContext";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import StatusPill from "../../components/ui/StatusPill";
import Pagination from "../../components/ui/Pagination";
import { Link } from "react-router-dom";

const PAGE_SIZE = 50;

const StudentAttendance = () => {
  const { student } = useAuth();
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAttendance = async () => {
    if (!student?.id) {
      setRecords([]);
      setTotalCount(0);
      return;
    }
    let query = supabase
      .from("attendance")
      .select("*", { count: "exact" })
      .eq("student_id", student.id)
      .order("date", { ascending: false });

    if (month) {
      const start = `${month}-01`;
      const end = format(lastDayOfMonth(parseISO(start)), "yyyy-MM-dd");
      query = query.gte("date", start).lte("date", end);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await query.range(from, to);
    setRecords(data || []);
    setTotalCount(count || 0);
  };

  useEffect(() => {
    fetchAttendance();
  }, [student?.id, month, page]);

  const pageCount = useMemo(
    () => Math.ceil(totalCount / PAGE_SIZE) || 1,
    [totalCount]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Attendance History"
        subtitle="Review every attendance entry marked by the admin."
        actions={
          <Link className="btn-outline" to="/student/attendance/calendar">
            Calendar view
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-slate-300">Filter by month</label>
          <input
            className="input-field max-w-[220px]"
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Marked By</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-white/5">
                  <td className="py-4">{formatDate(record.date)}</td>
                  <td className="py-4">
                    <StatusPill status={record.status} />
                  </td>
                  <td className="py-4">{record.marked_by || "Admin"}</td>
                </tr>
              ))}
              {!records.length ? (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
};

export default StudentAttendance;
