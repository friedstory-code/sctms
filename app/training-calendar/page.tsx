import { auth } from "@/lib/auth";
import { getSessions, createSession, enrollOperator, markAttendance, completeSession } from "./actions";
import { prisma } from "@/lib/prisma";

const SESSION_BADGE: Record<string, string> = {
  SCHEDULED: "sc-badge sc-badge-amber",
  COMPLETED: "sc-badge sc-badge-green",
  CANCELLED: "sc-badge sc-badge-red",
};

const ATTEND_BADGE: Record<string, string> = {
  ENROLLED: "sc-badge sc-badge-grey",
  ATTENDED: "sc-badge sc-badge-green",
  DID_NOT_ATTEND: "sc-badge sc-badge-red",
};

export default async function TrainingCalendarPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canSchedule = ["ADMIN", "MANAGER", "TRAINER"].includes(role);
  const canEnroll = ["ADMIN", "MANAGER", "TRAINER", "SUPERVISOR"].includes(role);

  const sessions = await getSessions();
  const operators = await prisma.operator.findMany({ orderBy: { fullName: "asc" } });
  const programmes = await prisma.trainingProgramme.findMany({
    include: { domain: true },
    orderBy: { code: "asc" },
  });

  const upcoming = sessions.filter((s) => s.status === "SCHEDULED");
  const past = sessions.filter((s) => s.status !== "SCHEDULED");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Training Calendar</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Schedule sessions, manage enrolments, and record attendance.
        </p>
      </div>

      {canSchedule && (
        <form action={createSession} className="sc-card p-5 space-y-3 max-w-xl">
          <h2 className="font-semibold sc-page-title text-sm">Schedule New Session</h2>
          <select name="programmeId" required className="sc-input">
            <option value="">Select programme…</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.domain.code} — {p.name}</option>
            ))}
          </select>
          <input type="datetime-local" name="date" required className="sc-input" />
          <select name="deliveryFormat" required className="sc-input">
            <option value="CLASSROOM">Classroom</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="OJT">OJT</option>
          </select>
          <input name="location" placeholder="Location (optional)" className="sc-input" />
          <button type="submit" className="sc-btn-primary">Schedule Session</button>
        </form>
      )}

      {/* Upcoming sessions */}
      <div>
        <h2 className="font-semibold sc-page-title text-base mb-4">Upcoming Sessions</h2>
        {upcoming.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No sessions scheduled.</p>
        )}
        <div className="space-y-4">
          {upcoming.map((s) => (
            <div key={s.id} className="sc-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold">{s.programme.domain.code} — {s.programme.name}</span>
                  <span className="text-sm ml-3" style={{ color: "var(--muted)" }}>
                    {new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {s.location && <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>· {s.location}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={SESSION_BADGE[s.status]}>{s.status}</span>
                  {canSchedule && (
                    <form action={completeSession}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button type="submit" className="sc-btn-secondary text-xs !py-1">Mark complete</button>
                    </form>
                  )}
                </div>
              </div>

              {/* Enrolment list */}
              <table className="min-w-full sc-table mt-2 mb-3">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Attendance</th>
                    {canSchedule && <th>Update</th>}
                  </tr>
                </thead>
                <tbody>
                  {s.enrollments.map((e) => (
                    <tr key={e.id}>
                      <td>{e.operator.fullName}</td>
                      <td><span className={ATTEND_BADGE[e.attendance]}>{e.attendance.replace("_", " ")}</span></td>
                      {canSchedule && (
                        <td>
                          <form action={markAttendance} className="flex gap-2">
                            <input type="hidden" name="enrollmentId" value={e.id} />
                            <select name="attendance" defaultValue={e.attendance} className="sc-input !w-auto text-xs py-1">
                              <option value="ENROLLED">Enrolled</option>
                              <option value="ATTENDED">Attended</option>
                              <option value="DID_NOT_ATTEND">Did not attend</option>
                            </select>
                            <button type="submit" className="sc-btn-secondary text-xs !py-1">Save</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  {s.enrollments.length === 0 && (
                    <tr><td colSpan={3} className="text-center" style={{ color: "var(--muted)" }}>No enrolments yet.</td></tr>
                  )}
                </tbody>
              </table>

              {canEnroll && (
                <form action={enrollOperator} className="flex gap-2 items-center">
                  <input type="hidden" name="sessionId" value={s.id} />
                  <select name="operatorId" required className="sc-input !w-auto text-xs py-1">
                    <option value="">Enrol operator…</option>
                    {operators.map((o) => (
                      <option key={o.id} value={o.id}>{o.fullName}</option>
                    ))}
                  </select>
                  <button type="submit" className="sc-btn-secondary text-xs !py-1">Enrol</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Past sessions */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold sc-page-title text-base mb-4">Past Sessions</h2>
          <div className="sc-card overflow-x-auto">
            <table className="min-w-full sc-table">
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Attended / Enrolled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((s) => (
                  <tr key={s.id}>
                    <td>{s.programme.domain.code} — {s.programme.name}</td>
                    <td>{new Date(s.date).toLocaleDateString()}</td>
                    <td>{s.location ?? "—"}</td>
                    <td>{s.enrollments.filter((e) => e.attendance === "ATTENDED").length} / {s.enrollments.length}</td>
                    <td><span className={SESSION_BADGE[s.status]}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
