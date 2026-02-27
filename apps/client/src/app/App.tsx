import { AppRouter } from "./router.js";
import { SessionStoreProvider } from "./useSessionStore.js";

export function App() {
  return (
    <SessionStoreProvider>
      <AppRouter />
    </SessionStoreProvider>
  );
}
