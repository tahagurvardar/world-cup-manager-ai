import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const MatchCenterPage = lazy(() => import("./pages/MatchCenterPage.jsx"));
const NewsPage = lazy(() => import("./pages/NewsPage.jsx"));
const PlayerProfilePage = lazy(() => import("./pages/PlayerProfilePage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const SelectTeamPage = lazy(() => import("./pages/SelectTeamPage.jsx"));
const SquadPage = lazy(() => import("./pages/SquadPage.jsx"));
const TacticsPage = lazy(() => import("./pages/TacticsPage.jsx"));
const TournamentPage = lazy(() => import("./pages/TournamentPage.jsx"));

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/select-team" element={<SelectTeamPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/squad" element={<SquadPage />} />
          <Route path="/player/:playerId" element={<PlayerProfilePage />} />
          <Route path="/tactics" element={<TacticsPage />} />
          <Route path="/match-center" element={<MatchCenterPage />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
