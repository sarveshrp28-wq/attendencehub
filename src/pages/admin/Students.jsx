import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteStudent, listStudents, sendPasswordReset } from "../../lib/api";
import { formatDate } from "../../lib/formatters";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState("");

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await listStudents();
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return students.filter((student) =>
      [student.name, student.email, student.class, student.register_number]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [students, search]);

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    setActionState("Deleting student...");
    const { data, error } = await deleteStudent({
      studentId: student.id,
      userId: student.user_id
    });
    if (error) {
      setActionState(error.message);
      return;
    }
    setActionState(data?.warning || "");
    loadStudents();
    if (data?.warning) {
      setTimeout(() => setActionState(""), 3500);
    }
  };

  const handleSendPasswordReset = async (student) => {
    setActionState(`Sending reset email to ${student.email}...`);
    const { data, error } = await sendPasswordReset({
      email: student.email,
      userId: student.user_id
    });
    if (error) {
      setActionState(error.message);
      return;
    }
    setActionState(data?.message || data?.warning || "Password reset email sent.");
    setTimeout(() => setActionState(""), 3500);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Students"
        subtitle="Manage student accounts, profiles, and login access."
        actions={
          <Link className="btn-primary" to="/admin/students/add">
            Add Student
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            className="input-field max-w-sm"
            placeholder="Search by name, email, class..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {actionState ? (
            <p className="text-sm text-slate-300">{actionState}</p>
          ) : null}
        </div>

        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-300">Loading students...</p>
          ) : filtered.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Class</th>
                  <th className="pb-3">Registered</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id} className="border-t border-white/5">
                    <td className="py-4">
                      <p className="font-semibold text-white">{student.name}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </td>
                    <td className="py-4">{student.class}</td>
                    <td className="py-4">{formatDate(student.created_at)}</td>
                    <td className="py-4 flex flex-wrap gap-2">
                      <Link
                        className="btn-outline text-xs"
                        to={`/admin/students/${student.id}`}
                      >
                        View
                      </Link>
                      <Link
                        className="btn-outline text-xs"
                        to={`/admin/students/edit/${student.id}`}
                      >
                        Edit
                      </Link>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => handleSendPasswordReset(student)}
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => handleDelete(student)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No students yet"
              description="Add a student to start tracking attendance."
              action={
                <Link className="btn-primary" to="/admin/students/add">
                  Add Student
                </Link>
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminStudents;
