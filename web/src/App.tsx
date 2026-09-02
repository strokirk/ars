import { route, matchRoute, navigate } from "./router.ts";
import { Home } from "./pages/Home.tsx";
import { Wizard } from "./pages/Wizard.tsx";
import { SheetView } from "./pages/SheetView.tsx";
import { Library } from "./pages/Library.tsx";

function TopBar({ current }: { current: string }) {
  return (
    <header class="topbar">
      <a class="home" href="#/" onClick={() => navigate("/")}>⚜ The Covenant Roster</a>
      <span class="spacer" />
      <a class={`navlink ${current === "library" ? "on" : ""}`} href="#/library" onClick={() => navigate("/library")}>Library</a>
    </header>
  );
}

export function App() {
  const m = matchRoute(route.value);
  return (
    <>
      <TopBar current={m.name} />
      <main class="wrap">
        {m.name === "home" && <Home />}
        {m.name === "new" && <Wizard kindParam={m.param!} />}
        {m.name === "edit" && <Wizard draftId={m.param!} />}
        {(m.name === "sheet" || m.name === "roster" || m.name === "share") && <SheetView match={m} />}
        {m.name === "library" && <Library tab={m.param} />}
        {m.name === "notfound" && (
          <div class="panel">
            <p>Nothing here. <a href="#/" onClick={() => navigate("/")}>Back to the roster.</a></p>
          </div>
        )}
      </main>
    </>
  );
}
