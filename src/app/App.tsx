import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";
import type { Role } from "../api/schemas";
import Sidebar from "./Sidebar";
import Live from "./Live";
import LoginPage from "../features/login/LoginPage";
import SignupPage from "../features/login/SignupPage";
import Dashboard from "../features/dashboard/Dashboard";
import AlertQueue from "../features/alerts/AlertQueue";
import CaseDetail from "../features/cases/CaseDetail";
import CasesList from "../features/cases/CasesList";
import ImportPage from "../features/imports/ImportPage";
import AccountPage from "../features/account/AccountPage";
import NotificationsPage from "../features/notifications/NotificationsPage";
import AdminProjectsPage from "../features/projects/AdminProjectsPage";
import AdminProjectDetailPage from "../features/projects/AdminProjectDetailPage";
import QaProjectsPage from "../features/projects/QaProjectsPage";
import QaProjectDetailPage from "../features/projects/QaProjectDetailPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

/** Shows the page only to the listed roles. The backend enforces the same rule on every call. */
function RequireRole({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const me = useMe();
  if (me.isPending) return <p className="text-sm text-ink-600">Loading…</p>;
  if (me.isError || !me.data) return <Navigate to="/login" replace />;
  if (!roles.includes(me.data.role as Role)) {
    return <p role="alert" className="text-brand-600">This page is not available for your role.</p>;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Live />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:pl-[104px] md:pr-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/alerts" element={<RequireAuth><RequireRole roles={["admin"]}><AlertQueue /></RequireRole></RequireAuth>} />
          <Route path="/import" element={<RequireAuth><RequireRole roles={["admin"]}><ImportPage /></RequireRole></RequireAuth>} />
          <Route path="/cases" element={<RequireAuth><CasesList /></RequireAuth>} />
          <Route path="/cases/:caseId" element={<RequireAuth><CaseDetail /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="/admin/projects" element={<RequireAuth><RequireRole roles={["admin"]}><AdminProjectsPage /></RequireRole></RequireAuth>} />
          <Route path="/admin/projects/:projectId" element={<RequireAuth><RequireRole roles={["admin"]}><AdminProjectDetailPage /></RequireRole></RequireAuth>} />
          <Route path="/qa/projects" element={<RequireAuth><RequireRole roles={["qa"]}><QaProjectsPage /></RequireRole></RequireAuth>} />
          <Route path="/qa/projects/:projectId" element={<RequireAuth><RequireRole roles={["qa"]}><QaProjectDetailPage /></RequireRole></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
