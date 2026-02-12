import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, TrendingUp, AlertTriangle, Flame } from "lucide-react";
import { getMonthlyStats, getMyStats } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { formatPercent } from "../../lib/formatters";
import { calculateStreak } from "../../lib/attendance";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";

const StudentDashboard = () => {
  const { student } = useAuth();
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!student?.id) {
        setStats(null);
        setMonthlyStats(null);
        setAttendance([]);
        setLoading(false);
        return;
      }

      try {
        const [{ data }, { data: monthlyData }, { data: attendanceData }] =
          await Promise.all([
            getMyStats(),
            getMonthlyStats({
              month: new Date().toISOString().slice(0, 10)
            }),
            supabase
              .from("attendance")
              .select("*")
              .eq("student_id", student.id)
              .order("date", { ascending: false })
              .limit(60)
          ]);

        setStats(data?.[0] || null);
        setMonthlyStats(monthlyData?.[0] || null);
        setAttendance(attendanceData || []);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadStats();
  }, [student?.id]);

  const streak = useMemo(() => calculateStreak(attendance), [attendance]);
  const attendancePercentage = stats?.attendance_percentage ?? 0;
  const needsAttention = attendancePercentage < 75;

  if (loading) {
    return <LoadingScreen label="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Your Attendance"
        subtitle="Track your progress, streaks, and recent activity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attendance %"
          value={formatPercent(attendancePercentage)}
          icon={TrendingUp}
        />
        <StatCard
          label="Present Days"
          value={stats?.present_days ?? 0}
          icon={CalendarCheck}
          accent="sunrise"
        />
        <StatCard
          label="Current Streak"
          value={`${streak} days`}
          icon={Flame}
        />
        <StatCard
          label="Alerts"
          value={needsAttention ? "Action needed" : "On track"}
          icon={AlertTriangle}
          accent={needsAttention ? "sunrise" : "aqua"}
        />
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-white">Summary</h3>
        <p className="text-sm text-slate-300 mt-2">
          Total days tracked: {stats?.total_days ?? 0}. Absent days:
          {" "}
          {stats?.absent_days ?? 0}.
        </p>
        <div className="mt-4 grid gap-2 text-sm text-slate-300">
          <p>
            This month: {monthlyStats?.present_days ?? 0} present /
            {" "}
            {monthlyStats?.total_days ?? 0} total (
            {formatPercent(monthlyStats?.attendance_percentage ?? 0)})
          </p>
        </div>
        {needsAttention ? (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-200">
              Your attendance is below 75%. Consider speaking with your admin if
              you need help improving your schedule.
            </p>
          </div>
        ) : (
          <p className="text-sm text-emerald-200 mt-4">
            Great work! You are above the recommended attendance threshold.
          </p>
        )}
      </Card>
    </div>
  );
};

export default StudentDashboard;
