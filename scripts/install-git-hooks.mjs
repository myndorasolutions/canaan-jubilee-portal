import { chmod, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

if (!existsSync(".git")) {
  process.exit(0);
}

await mkdir(".git/hooks", { recursive: true });
await copyFile("scripts/git-hooks/pre-push", ".git/hooks/pre-push");
await chmod(".git/hooks/pre-push", 0o755);
