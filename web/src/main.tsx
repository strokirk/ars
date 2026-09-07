import { render } from "preact";
import "./webawesome.ts";
import "./styles.css";
import { App } from "./App.tsx";

render(<App />, document.getElementById("app")!);
