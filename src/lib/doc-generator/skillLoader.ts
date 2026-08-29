import fs from "fs";
import path from "path";

export const SKILLPATCH_SKILL_RELATIVE_PATH = path.join(".latentcode", "skills", "api-documentation", "SKILL.md");

export class DocGeneratorError extends Error {
  public readonly code: "MISSING_SKILL_FILE" | "MISSING_API_KEY" | "INVALID_INPUT" | "MALFORMED_OUTPUT" | "GENERATION_FAILED";

  constructor(
    message: string,
    code: "MISSING_SKILL_FILE" | "MISSING_API_KEY" | "INVALID_INPUT" | "MALFORMED_OUTPUT" | "GENERATION_FAILED"
  ) {
    super(message);
    this.name = "DocGeneratorError";
    this.code = code;
  }
}

export function loadApiDocumentationSkill(baseDir?: string): string {
  const rootDir = baseDir || process.cwd();
  const fullPath = path.resolve(rootDir, SKILLPATCH_SKILL_RELATIVE_PATH);

  try {
    if (!fs.existsSync(fullPath)) {
      throw new DocGeneratorError(
        `Installed SkillPatch skill file not found at: ${fullPath}`,
        "MISSING_SKILL_FILE"
      );
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    if (!content || !content.trim()) {
      throw new DocGeneratorError(
        `Installed SkillPatch skill file at ${fullPath} is empty.`,
        "MISSING_SKILL_FILE"
      );
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof DocGeneratorError) throw err;

    const error = err as { message?: string };
    throw new DocGeneratorError(
      `Failed to read SkillPatch skill file: ${error.message || "Unknown error"}`,
      "MISSING_SKILL_FILE"
    );
  }
}
