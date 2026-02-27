import { Route, Routes } from "react-router";
import { LobbyPage } from "../pages/LobbyPage.js";
import { NotFoundPage } from "../pages/NotFoundPage.js";
import { OfflinePage } from "../pages/OfflinePage.js";
import { RoomPage } from "../pages/RoomPage.js";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/offline" element={<OfflinePage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
