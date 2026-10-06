import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const command = process.argv[2];
if (!["dev", "build", "start"].includes(command))
  throw new Error("Use dev, build or start");
const args = [
  require.resolve("next/dist/bin/next"),
  command,
  ...(command === "start" ? [] : ["--webpack"]),
  ...(command === "build" ? [] : ["-p", process.env.PORT || "3000"]),
];
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, SPACE_EYE_STANDALONE: "true" },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
