#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { lint, RULES } from "./linter.mjs";

const args = process.argv.slice(2);

function printHelp(stream = process.stdout) {
  stream.write(
    `promptlint — AI prompt static linter

Usage:
  promptlint <file>              Lint a prompt file
  promptlint <file> --json       JSON output
  promptlint <file> --trim       Print trimmed version to stdout
  cat <file> | promptlint -      Lint from stdin

Options:
  --json      JSON output (machine-readable)
  --trim      Print trimmed text only (for piping)
  --rules     List rule IDs and exit
  -h, --help  Show this help

Exit codes:
  0  no errors
  1  at least one "error" issue
  2  bad usage
`
  );
}

// --help / -h: print help and exit 0.
if (args.includes("-h") || args.includes("--help")) {
  printHelp(process.stdout);
  process.exit(0);
}

// No args: print "missing <file>" to stderr, help to stderr, exit 2.
if (args.length === 0) {
  process.stderr.write("promptlint: missing <file>\n\n");
  printHelp(process.stderr);
  process.exit(2);
}

if (args.includes("--rules")) {
  for (const r of RULES) console.log(r);
  process.exit(0);
}

const file = args[0];
const mode = args.includes("--json")
  ? "json"
  : args.includes("--trim")
    ? "trim"
    : "report";

async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
}

let text;
try {
  text = file === "-" ? await readStdin() : readFileSync(file, "utf8");
} catch (err) {
  process.stderr.write(`promptlint: cannot read ${file}: ${err.message}\n`);
  process.exit(2);
}

const result = lint(text);

if (mode === "json") {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.issues.some((i) => i.severity === "error") ? 1 : 0);
}

if (mode === "trim") {
  process.stdout.write(result.trimmed);
  if (!result.trimmed.endsWith("\n")) process.stdout.write("\n");
  process.exit(0);
}

// Human report
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = useColor
  ? {
      reset: "\x1b[0m",
      dim: "\x1b[2m",
      bold: "\x1b[1m",
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      green: "\x1b[32m",
      gray: "\x1b[90m",
    }
  : Object.fromEntries(
      ["reset", "dim", "bold", "red", "yellow", "cyan", "green", "gray"].map((k) => [
        k,
        "",
      ])
    );

const sevTag = {
  error: `${c.red}error${c.reset}`,
  warn: `${c.yellow}warn ${c.reset}`,
  info: `${c.cyan}info ${c.reset}`,
};

const displayName = file === "-" ? "<stdin>" : file;
process.stdout.write(`\n${c.bold}promptlint${c.reset} ${c.gray}${displayName}${c.reset}\n`);
process.stdout.write(
  `  score  ${c.bold}${result.score}${c.reset}/100\n`
);
process.stdout.write(
  `  tokens ${result.tokensBefore} → ${result.tokensAfter} ` +
    `(${c.green}-${result.saved}${c.reset}, ${result.savedPercent}% saved)\n`
);
process.stdout.write(`  issues ${result.issues.length}\n`);
if (result.note) {
  process.stdout.write(`  note   ${c.dim}${result.note}${c.reset}\n`);
}
process.stdout.write(`\n`);

for (const i of result.issues) {
  process.stdout.write(
    `  ${sevTag[i.severity] ?? i.severity}  ${c.dim}[${i.rule}]${c.reset} ${i.message}\n`
  );
  if (i.suggestion)
    process.stdout.write(`         ${c.dim}→ ${i.suggestion}${c.reset}\n`);
  if (i.samples) {
    for (const s of i.samples.slice(0, 2)) {
      const shown = s.length > 80 ? s.slice(0, 77) + "..." : s;
      process.stdout.write(`         ${c.gray}· ${shown}${c.reset}\n`);
    }
  }
}
process.stdout.write("\n");

process.exit(result.issues.some((i) => i.severity === "error") ? 1 : 0);
