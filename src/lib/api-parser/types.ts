export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type ChangeType = "ADDED" | "MODIFIED" | "REMOVED" | "UNKNOWN";

export interface ApiParameter {
  name: string;
  in: "path" | "query" | "header" | "body" | "unknown";
  type?: string;
  required?: boolean;
}

export interface ApiRequestBodyField {
  fieldName: string;
  type?: string;
  required?: boolean;
}

export interface ApiResponseChange {
  statusCode: number;
  description?: string;
}

export interface ApiChange {
  filePath: string;
  method: HttpMethod;
  path: string;
  changeType: ChangeType;
  patchSnippet?: string;
  parameters: ApiParameter[];
  requestBodyFields: ApiRequestBodyField[];
  responses: ApiResponseChange[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface ParseResult {
  changes: ApiChange[];
  totalRoutesIdentified: number;
  filesProcessed: number;
  skippedFiles: string[];
}
