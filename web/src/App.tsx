import { route, matchRoute, navigate } from "./router.ts";
import { Home } from "./pages/Home.tsx";
import { Wizard } from "./pages/Wizard.tsx";
import { SheetView } from "./pages/SheetView.tsx";

function TopBar() {
  return (
    <header class="topbar">
      <a class="home" href="#/" onClick={() => navigate("/")}>⚜ The Covenant Roster</a>
      <span class="spacer" />
    </header>
  );
}

export function App() {
  const m = matchRoute(route.value);
  return (
    <>
      <TopBar />
      <main class="wrap">
        {m.name === "home" && <Home />}
        {m.name === "new" && <Wizard kindParam={m.param!} />}
        {m.name === "edit" && <Wizard draftId={m.param!} />}
        {(m.name === "sheet" || m.name === "share") && <SheetView match={m} />}
        {m.name === "notfound" && (
          <div class="panel">
            <p>Nothing here. <a href="#/" onClick={() => navigate("/")}>Back to the roster.</a></p>
          </div>
        )}
      </main>
    </>
  );
}
