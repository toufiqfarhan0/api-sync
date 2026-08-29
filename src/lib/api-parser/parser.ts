import { PRFileChange } from "../github/types";
import {
  ApiChange,
  ApiParameter,
  ApiRequestBodyField,
  ApiResponseChange,
  ChangeType,
  HttpMethod,
  ParseResult,
} from "./types";

const API_FILE_REGEX = /\.(js|ts|jsx|tsx|mjs|cjs)$/i;

// Express/FastAPI/Koa/NestJS route method regex
const EXPRESS_ROUTE_REGEX = /(?:app|router|server)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

// Next.js App Router handler exports: export async function GET / POST ...
const NEXT_APP_ROUTER_REGEX = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/gi;

export function isApiFileCandidate(filename: string): boolean {
  if (!API_FILE_REGEX.test(filename)) return false;
  const lower = filename.toLowerCase();
  return (
    lower.includes("route") ||
    lower.includes("controller") ||
    lower.includes("api") ||
    lower.includes("endpoint") ||
    lower.includes("handler") ||
    lower.includes("server") ||
    lower.includes("app")
  );
}

export function extractPathParameters(path: string): ApiParameter[] {
  const params: ApiParameter[] = [];
  // Express style :id or OpenAPI/Next style {id}
  const paramMatches = path.matchAll(/[:{]([a-zA-Z0-9_]+)}?/g);

  for (const match of paramMatches) {
    if (match[1]) {
      params.push({
        name: match[1],
        in: "path",
        required: true,
      });
    }
  }

  return params;
}

export function extractQueryParamsFromContext(contextText: string): ApiParameter[] {
  const queryParams: ApiParameter[] = [];
  // req.query.search or req.query['search']
  const queryMatches = contextText.matchAll(/req\.query(?:\.([a-zA-Z0-9_]+)|\[['"`]([a-zA-Z0-9_]+)['"`]\])/g);

  for (const match of queryMatches) {
    const name = match[1] || match[2];
    if (name && !queryParams.some((p) => p.name === name)) {
      queryParams.push({
        name,
        in: "query",
        required: false,
      });
    }
  }

  return queryParams;
}

export function extractRequestBodyFieldsFromContext(contextText: string): ApiRequestBodyField[] {
  const fields: ApiRequestBodyField[] = [];

  // Destructuring: const { name, email } = req.body
  const destructureMatches = contextText.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:req|request)\.body/g);
  for (const match of destructureMatches) {
    if (match[1]) {
      const vars = match[1].split(",");
      for (const v of vars) {
        const cleaned = v.trim().split("=")[0].trim().split(":")[0].trim();
        if (cleaned && /^[a-zA-Z0-9_]+$/.test(cleaned) && !fields.some((f) => f.fieldName === cleaned)) {
          fields.push({ fieldName: cleaned });
        }
      }
    }
  }

  // Direct access: req.body.fieldName
  const directMatches = contextText.matchAll(/(?:req|request)\.body\.([a-zA-Z0-9_]+)/g);
  for (const match of directMatches) {
    const fieldName = match[1];
    if (fieldName && !fields.some((f) => f.fieldName === fieldName)) {
      fields.push({ fieldName });
    }
  }

  return fields;
}

export function extractStatusCodesFromContext(contextText: string): ApiResponseChange[] {
  const responses: ApiResponseChange[] = [];

  // res.status(200) or status(201) or res.sendStatus(404)
  const statusMatches = contextText.matchAll(/(?:res|response)\.(?:status|sendStatus)\s*\(\s*(\d{3})\s*\)/g);
  for (const match of statusMatches) {
    const statusCode = parseInt(match[1], 10);
    if (statusCode >= 100 && statusCode < 600 && !responses.some((r) => r.statusCode === statusCode)) {
      responses.push({ statusCode });
    }
  }

  return responses;
}

export function parseFilePatchForRoutes(file: PRFileChange): ApiChange[] {
  if (!file.patch || !file.patch.trim()) return [];

  const changes: ApiChange[] = [];
  const lines = file.patch.split("\n");

  // Filter patch additions vs removals vs context
  const addedLines = lines.filter((l) => l.startsWith("+")).map((l) => l.substring(1));
  const removedLines = lines.filter((l) => l.startsWith("-")).map((l) => l.substring(1));
  const fullPatchText = lines.map((l) => (l.startsWith("+") || l.startsWith("-") || l.startsWith(" ") ? l.substring(1) : l)).join("\n");

  // 1. Process Express style routes
  const expressMatches = Array.from(fullPatchText.matchAll(EXPRESS_ROUTE_REGEX));
  for (const match of expressMatches) {
    const rawMethod = match[1].toUpperCase() as HttpMethod;
    const path = match[2];
    const fullMatchText = match[0];

    // Determine if this match line was added, removed, or present
    const isAdded = addedLines.some((l) => l.includes(fullMatchText));
    const isRemoved = removedLines.some((l) => l.includes(fullMatchText));

    let changeType: ChangeType = "MODIFIED";
    if (isAdded && !isRemoved) changeType = "ADDED";
    if (isRemoved && !isAdded) changeType = "REMOVED";

    const pathParams = extractPathParameters(path);
    const queryParams = extractQueryParamsFromContext(fullPatchText);
    const requestBodyFields = extractRequestBodyFieldsFromContext(fullPatchText);
    const responses = extractStatusCodesFromContext(fullPatchText);

    changes.push({
      filePath: file.filename,
      method: rawMethod,
      path,
      changeType,
      patchSnippet: match[0],
      parameters: [...pathParams, ...queryParams],
      requestBodyFields,
      responses,
      confidence: "HIGH",
    });
  }

  // 2. Process Next.js App Router style handlers
  const nextMatches = Array.from(fullPatchText.matchAll(NEXT_APP_ROUTER_REGEX));
  for (const match of nextMatches) {
    const rawMethod = match[1].toUpperCase() as HttpMethod;

    // Infer Next.js App Router path from file path e.g. app/api/users/[id]/route.ts -> /api/users/:id
    let inferredPath = "/api";
    if (file.filename.includes("app/")) {
      const parts = file.filename.split("app")[1];
      inferredPath = parts
        .replace(/\/route\.(ts|js|tsx|jsx)$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1");
    }

    const fullMatchText = match[0];
    const isAdded = addedLines.some((l) => l.includes(fullMatchText));
    const isRemoved = removedLines.some((l) => l.includes(fullMatchText));

    let changeType: ChangeType = "MODIFIED";
    if (isAdded && !isRemoved) changeType = "ADDED";
    if (isRemoved && !isAdded) changeType = "REMOVED";

    const pathParams = extractPathParameters(inferredPath);
    const queryParams = extractQueryParamsFromContext(fullPatchText);
    const requestBodyFields = extractRequestBodyFieldsFromContext(fullPatchText);
    const responses = extractStatusCodesFromContext(fullPatchText);

    changes.push({
      filePath: file.filename,
      method: rawMethod,
      path: inferredPath,
      changeType,
      patchSnippet: match[0],
      parameters: [...pathParams, ...queryParams],
      requestBodyFields,
      responses,
      confidence: "MEDIUM",
    });
  }

  return changes;
}

export function parseApiChangesFromFiles(files: PRFileChange[]): ParseResult {
  const changes: ApiChange[] = [];
  const skippedFiles: string[] = [];
  let filesProcessed = 0;

  for (const file of files) {
    if (!isApiFileCandidate(file.filename)) {
      skippedFiles.push(file.filename);
      continue;
    }

    filesProcessed++;
    const fileChanges = parseFilePatchForRoutes(file);
    changes.push(...fileChanges);
  }

  return {
    changes,
    totalRoutesIdentified: changes.length,
    filesProcessed,
    skippedFiles,
  };
}
