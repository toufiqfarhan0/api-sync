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

// Embedded SkillPatch instructions fallback to guarantee Vercel serverless availability
export const EMBEDDED_SKILLPATCH_INSTRUCTIONS = `# Skill: api-documentation

Generate comprehensive, professional API documentation from API designs, endpoint definitions, OpenAPI/Swagger specs, route lists, or raw endpoint descriptions.

## Guidelines
- Format response with clear Markdown headings, parameters table (Name, Type, Required, Description), request body models, status code responses (200, 400, 404, 500), and curl example requests.
- Ensure technical precision matching the code diff without hallucination.
`;

export function loadApiDocumentationSkill(baseDir?: string): string {
  const rootDir = baseDir || process.cwd();
  
  // Candidate paths to support both local dev and Vercel serverless function bundles
  const candidatePaths = [
    path.resolve(rootDir, SKILLPATCH_SKILL_RELATIVE_PATH),
    path.resolve(process.cwd(), SKILLPATCH_SKILL_RELATIVE_PATH),
    path.join(__dirname, "..", "..", "..", SKILLPATCH_SKILL_RELATIVE_PATH),
  ];

  for (const fullPath of candidatePaths) {
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content && content.trim()) {
          return content;
        }
      }
    } catch {
      // Continue trying candidate paths
    }
  }

  // Fallback for Vercel serverless runtimes where dot-folders are omitted from trace bundles
  return EMBEDDED_SKILLPATCH_INSTRUCTIONS;
}
