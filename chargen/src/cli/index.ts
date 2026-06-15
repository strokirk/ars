#!/usr/bin/env node
// Entry point: resolve global flags, load the rules data, dispatch to a command.
import { parseArgs, flagBool, flagStr } from "./args.ts";
import { loadRules } from "../data/load-node.ts";
import { TOP_HELP, COMMAND_HELP } from "./help.ts";
import {
  cmdAdd, cmdApply, cmdBuild, cmdCheck, cmdExport, cmdNew, cmdNotes,
  cmdOptions, cmdRemove, cmdSchema, cmdSet, cmdStatus, type Ctx,
} from "./commands.ts";

const HANDLERS: Record<string, (ctx: Ctx) => number> = {
  new: cmdNew, build: cmdBuild, apply: cmdApply, status: cmdStatus,
  options: cmdOptions, schema: cmdSchema, set: cmdSet, add: cmdAdd,
  remove: cmdRemove, notes: cmdNotes, check: cmdCheck, export: cmdExport,
};

function main(argv: string[]): number {
  const { positionals, flags } = parseArgs(argv);
  const command = positionals[0];

  if (!command || command === "help") {
    console.log(TOP_HELP);
    return 0;
  }
  const handler = HANDLERS[command];
  if (!handler) {
    console.error(`Unknown command "${command}". Run \`chargen --help\`. Commands: ${Object.keys(HANDLERS).join(", ")}`);
    return 2;
  }
  if (flagBool(flags, "help")) {
    console.log(COMMAND_HELP[command] ?? TOP_HELP);
    return 0;
  }

  const ctx: Ctx = {
    positionals: positionals.slice(1),
    flags,
    charPath: flagStr(flags, "char") ?? "character.json",
    rules: loadRules(flagStr(flags, "data-dir")),
    json: flagBool(flags, "json"),
  };
  try {
    return handler(ctx);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(ctx.json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
    return 2;
  }
}

process.exit(main(process.argv.slice(2)));
