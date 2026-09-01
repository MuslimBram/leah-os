// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { describe, expect, it } from "bun:test";
import { extractGeneratedFiles } from "./generated-files";

describe("generated file extraction", () => {
  it("extracts explicit bold path + code pairs", () => {
    const files = extractGeneratedFiles(`**src/a.ts**\n\`\`\`ts\nexport const a = 1;\n\`\`\`\n\n**src/b.ts**\n\`\`\`ts\nexport const b = 2;\n\`\`\``);
    expect(files).toEqual([
      { path: "src/a.ts", content: "export const a = 1;\n" },
      { path: "src/b.ts", content: "export const b = 2;\n" },
    ]);
  });

  it("fails instead of guessing a filename from prose-only output", () => {
    expect(() => extractGeneratedFiles("Here is the implementation without a file block.")).toThrow("canonical path + code blocks");
  });

  it("does not interpret a bare prose heading as a repository path", () => {
    expect(() => extractGeneratedFiles(`Here is src/a.ts\n\`\`\`ts\nexport const a = 1;\n\`\`\``)).toThrow("canonical path + code blocks");
  });

  it("blocks autonomous .github modification", () => {
    expect(() => extractGeneratedFiles(`**.github/CODEOWNERS**\n\`\`\`text\n* @attacker\n\`\`\``)).toThrow("protected path");
  });

  it("blocks generated secret files", () => {
    expect(() => extractGeneratedFiles(`**.env.production**\n\`\`\`text\nTOKEN=secret\n\`\`\``)).toThrow("protected path");
  });

  it("rejects traversal and absolute paths", () => {
    expect(() => extractGeneratedFiles(`**src/../secret.ts**\n\`\`\`ts\nx\n\`\`\``)).toThrow("Invalid generated file path");
    expect(() => extractGeneratedFiles(`**/etc/passwd**\n\`\`\`text\nx\n\`\`\``)).toThrow("Invalid generated file path");
  });

  it("rejects duplicate output paths", () => {
    expect(() => extractGeneratedFiles(`**src/a.ts**\n\`\`\`ts\na\n\`\`\`\n**src/a.ts**\n\`\`\`ts\nb\n\`\`\``)).toThrow("duplicate path");
  });
});
