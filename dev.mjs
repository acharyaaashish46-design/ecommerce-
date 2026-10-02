// One command to run backend (Express API) + frontend (Vite) together.
// Usage: npm run dev
import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

console.log(
  [
    "",
    "  \x1b[1;36mAashish welcome\x1b[0m",
    "",
    "  \x1b[36mStorefront\x1b[0m  ->  \x1b[1mhttp://localhost:5173\x1b[0m",
    "  \x1b[35mAdmin panel\x1b[0m ->  \x1b[1mhttp://localhost:5173/admin\x1b[0m",
    "  \x1b[34mREST API\x1b[0m    ->  \x1b[1mhttp://localhost:5000/api/health\x1b[0m",
    "",
    "  Starting backend + frontend... (press Ctrl+C to stop both)",
    "",
  ].join("\n")
);

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  process.exit(code);
}

function run(label, command) {
  const child = spawn(command, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.log(`\n  [${label}] exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", `${npm} run dev --prefix server`); // backend  -> http://localhost:5000
run("web", `${npm} run dev --prefix client`); // frontend -> http://localhost:5173
