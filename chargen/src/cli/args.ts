// Tiny zero-dependency argument parser. Booleans are listed explicitly; every other
// --flag consumes the next token as its value (also supports --flag=value).
export type Flags = Record<string, string | true | undefined>;

export interface ParsedArgs {
  positionals: string[];
  flags: Flags;
}

// Note: --describe is NOT boolean — it takes a name argument (e.g. --describe "Affinity with Art").
const BOOLEAN_FLAGS = new Set(["json", "force", "free", "help", "learnable", "html"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "-h") { flags.help = true; continue; }
    if (!tok.startsWith("--")) { positionals.push(tok); continue; }
    const body = tok.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) { flags[body.slice(0, eq)] = body.slice(eq + 1); continue; }
    if (BOOLEAN_FLAGS.has(body)) { flags[body] = true; continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) { flags[body] = true; } // tolerate missing value
    else { flags[body] = next; i++; }
  }
  return { positionals, flags };
}

export function flagStr(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

export function flagNum(flags: Flags, key: string): number | undefined {
  const v = flagStr(flags, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function flagBool(flags: Flags, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}
