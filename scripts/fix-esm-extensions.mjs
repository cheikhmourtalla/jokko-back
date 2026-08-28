import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);

function collectJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectJavaScriptFiles(entryPath);
    }

    return entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

function resolvesToJavaScript(importerPath, specifier) {
  const resolvedPath = path.resolve(path.dirname(importerPath), specifier);
  return (
    fs.existsSync(`${resolvedPath}.js`) ||
    (fs.existsSync(resolvedPath) &&
      fs.statSync(resolvedPath).isDirectory() &&
      fs.existsSync(path.join(resolvedPath, "index.js")))
  );
}

if (fs.existsSync(distDirectory)) {
  for (const filePath of collectJavaScriptFiles(distDirectory)) {
    const source = fs.readFileSync(filePath, "utf8");
    const fixedSource = source.replace(
      /(["'])(\.\.?\/[^"']+)\1/g,
      (match, quote, specifier) => {
        if (
          specifier.endsWith(".js") ||
          specifier.endsWith(".json") ||
          !resolvesToJavaScript(filePath, specifier)
        ) {
          return match;
        }

        return `${quote}${specifier}.js${quote}`;
      },
    );

    if (fixedSource !== source) {
      fs.writeFileSync(filePath, fixedSource);
    }
  }
}
