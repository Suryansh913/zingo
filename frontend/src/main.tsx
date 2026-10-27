import React from "react"; import { createRoot } from "react-dom/client"; import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./index.css"; import ErrorBoundary from "./components/ErrorBoundary"; import NotFound from "./pages/NotFound"; import StatusPage from "./pages/StatusPage"; import { API_CONFIG_ERROR } from "./lib/api"; import { AuthProvider, useAuth } from "./lib/auth"; import Nav from "./components/Nav";
import { Login, Signup } from "./pages/AuthPages"; import Zings from "./pages/Zings"; import ProfilePage from "./pages/ProfilePage";
import BattlesPage from "./pages/BattlesPage"; import CreateBattle from "./pages/CreateBattle"; import MyBattles from "./pages/MyBattles"; import BattleDetail from "./pages/BattleDetail";
import ChatInbox from "./pages/ChatInbox"; import ChatRoom from "./pages/ChatRoom"; import ChatWith from "./pages/ChatWith"; import NotificationsPage from "./pages/NotificationsPage"; import { RealtimeProvider } from "./lib/realtime";
import MatchPage from "./pages/MatchPage";
import HomePage from "./pages/HomePage"; import SearchPage from "./pages/SearchPage"; import ExplorePage from "./pages/ExplorePage"; import WhatNextPage from "./pages/WhatNextPage";
import DatePage from "./pages/DatePage";
import UploadPage from "./pages/UploadPage"; import StoryPage from "./pages/StoryPage"; import SingleVideo from "./pages/SingleVideo";
function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-dvh place-items-center text-white/60">Loading…</div>;
  return user ? <RealtimeProvider><Nav><Outlet /></Nav></RealtimeProvider> : <Navigate to="/login" replace />;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><ErrorBoundary><AuthProvider>{API_CONFIG_ERROR && <div role="alert" className="bg-red-600 p-3 text-center text-sm text-white">Configuration problem: {API_CONFIG_ERROR}</div>}<BrowserRouter><Routes>
  <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} />
  {/* The static entry file. A host rule that "redirects" every path to /index.html (instead of rewriting) lands users here; send them to the real home page. */}
  <Route path="/index.html" element={<Navigate to="/" replace />} />
  <Route element={<Protected />}>
    <Route path="/" element={<HomePage />} /><Route path="/zings" element={<Zings />} /><Route path="/search" element={<SearchPage />} /><Route path="/explore" element={<ExplorePage />} /><Route path="/whatnext" element={<WhatNextPage />} /><Route path="/upload" element={<UploadPage />} />
    <Route path="/u/:username" element={<ProfilePage />} /><Route path="/story/:nodeId" element={<StoryPage />} />
    <Route path="/match" element={<MatchPage />} /><Route path="/date" element={<DatePage />} /><Route path="/battles" element={<BattlesPage />} /><Route path="/battles/new" element={<CreateBattle />} /><Route path="/battles/mine" element={<MyBattles />} /><Route path="/battle/:id" element={<BattleDetail />} />
    <Route path="/chat" element={<ChatInbox />} /><Route path="/chat/with/:username" element={<ChatWith />} /><Route path="/chat/:id" element={<ChatRoom />} /><Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/video/:id" element={<SingleVideo />} />
  <Route path="*" element={<NotFound />} /></Route><Route path="/status" element={<StatusPage />} />
</Routes></BrowserRouter></AuthProvider></ErrorBoundary></React.StrictMode>);
