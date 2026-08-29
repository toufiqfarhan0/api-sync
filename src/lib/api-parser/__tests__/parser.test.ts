import { describe, expect, it } from "vitest";
import { PRFileChange } from "../../github/types";
import {
  extractPathParameters,
  extractQueryParamsFromContext,
  extractRequestBodyFieldsFromContext,
  extractStatusCodesFromContext,
  isApiFileCandidate,
  parseApiChangesFromFiles,
  parseFilePatchForRoutes,
} from "../parser";

describe("Deterministic API Change Parser", () => {
  describe("isApiFileCandidate", () => {
    it("identifies API-relevant file paths", () => {
      expect(isApiFileCandidate("src/routes/users.ts")).toBe(true);
      expect(isApiFileCandidate("src/controllers/authController.js")).toBe(true);
      expect(isApiFileCandidate("src/app/api/products/route.ts")).toBe(true);
      expect(isApiFileCandidate("src/endpoints/orders.tsx")).toBe(true);
    });

    it("rejects non-API files", () => {
      expect(isApiFileCandidate("src/components/Header.tsx")).toBe(false);
      expect(isApiFileCandidate("styles/globals.css")).toBe(false);
      expect(isApiFileCandidate("README.md")).toBe(false);
      expect(isApiFileCandidate("package.json")).toBe(false);
    });
  });

  describe("Parameter & Context Extraction Helpers", () => {
    it("extracts path parameters from Express and Next.js style paths", () => {
      const expressParams = extractPathParameters("/api/users/:id/posts/:postId");
      expect(expressParams).toHaveLength(2);
      expect(expressParams[0]).toEqual({ name: "id", in: "path", required: true });
      expect(expressParams[1]).toEqual({ name: "postId", in: "path", required: true });

      const nextParams = extractPathParameters("/api/users/{userId}");
      expect(nextParams).toHaveLength(1);
      expect(nextParams[0].name).toBe("userId");
    });

    it("extracts query parameters deterministically", () => {
      const snippet = `
        const query = req.query.search;
        const page = req.query['page'];
      `;
      const queryParams = extractQueryParamsFromContext(snippet);
      expect(queryParams).toHaveLength(2);
      expect(queryParams[0]).toEqual({ name: "search", in: "query", required: false });
      expect(queryParams[1]).toEqual({ name: "page", in: "query", required: false });
    });

    it("extracts request body fields from destructuring and direct access", () => {
      const snippet = `
        const { name, email, role = 'user' } = req.body;
        const age = req.body.age;
      `;
      const bodyFields = extractRequestBodyFieldsFromContext(snippet);
      expect(bodyFields.map((f) => f.fieldName)).toEqual(["name", "email", "role", "age"]);
    });

    it("extracts response status codes deterministically", () => {
      const snippet = `
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.status(201).json(user);
      `;
      const responses = extractStatusCodesFromContext(snippet);
      expect(responses.map((r) => r.statusCode)).toEqual([404, 201]);
    });
  });

  describe("parseFilePatchForRoutes", () => {
    it("parses new route addition", () => {
      const file: PRFileChange = {
        filename: "src/routes/userRoutes.ts",
        status: "modified",
        additions: 10,
        deletions: 0,
        changes: 10,
        patch: `
@@ -0,0 +1,10 @@
+router.post('/api/v1/users', async (req, res) => {
+  const { name, email } = req.body;
+  res.status(201).json({ id: 1, name, email });
+});
        `,
      };

      const changes = parseFilePatchForRoutes(file);
      expect(changes).toHaveLength(1);
      expect(changes[0].method).toBe("POST");
      expect(changes[0].path).toBe("/api/v1/users");
      expect(changes[0].changeType).toBe("ADDED");
      expect(changes[0].requestBodyFields.map((f) => f.fieldName)).toEqual(["name", "email"]);
      expect(changes[0].responses.map((r) => r.statusCode)).toEqual([201]);
    });

    it("parses route removal", () => {
      const file: PRFileChange = {
        filename: "src/routes/userRoutes.ts",
        status: "modified",
        additions: 0,
        deletions: 3,
        changes: 3,
        patch: `
@@ -10,3 +10,0 @@
-router.delete('/api/v1/users/:id', async (req, res) => {
-  res.status(204).send();
-});
        `,
      };

      const changes = parseFilePatchForRoutes(file);
      expect(changes).toHaveLength(1);
      expect(changes[0].method).toBe("DELETE");
      expect(changes[0].path).toBe("/api/v1/users/:id");
      expect(changes[0].changeType).toBe("REMOVED");
      expect(changes[0].parameters).toContainEqual({ name: "id", in: "path", required: true });
    });

    it("parses multiple routes in a single file patch", () => {
      const file: PRFileChange = {
        filename: "src/routes/productRoutes.ts",
        status: "modified",
        additions: 12,
        deletions: 0,
        changes: 12,
        patch: `
@@ -1,5 +1,15 @@
 router.get('/products', (req, res) => {
   const category = req.query.category;
   res.status(200).json([]);
 });
+router.put('/products/:id', (req, res) => {
+  const { title, price } = req.body;
+  res.status(200).json({});
+});
        `,
      };

      const changes = parseFilePatchForRoutes(file);
      expect(changes).toHaveLength(2);
      expect(changes[0].method).toBe("GET");
      expect(changes[0].path).toBe("/products");
      expect(changes[1].method).toBe("PUT");
      expect(changes[1].path).toBe("/products/:id");
      expect(changes[1].parameters[0]).toEqual({ name: "id", in: "path", required: true });
    });

    it("handles Next.js App Router route handlers", () => {
      const file: PRFileChange = {
        filename: "src/app/api/orders/[id]/route.ts",
        status: "added",
        additions: 5,
        deletions: 0,
        changes: 5,
        patch: `
+export async function GET(req: Request) {
+  return res.status(200).json({ orderId: 1 });
+}
        `,
      };

      const changes = parseFilePatchForRoutes(file);
      expect(changes).toHaveLength(1);
      expect(changes[0].method).toBe("GET");
      expect(changes[0].path).toBe("/api/orders/:id");
    });

    it("returns empty array for empty, missing, or non-matching patches", () => {
      const emptyFile: PRFileChange = {
        filename: "src/routes/empty.ts",
        status: "modified",
        additions: 0,
        deletions: 0,
        changes: 0,
        patch: "",
      };

      expect(parseFilePatchForRoutes(emptyFile)).toEqual([]);
    });
  });

  describe("parseApiChangesFromFiles", () => {
    it("processes API files and skips non-API files deterministically", () => {
      const files: PRFileChange[] = [
        {
          filename: "src/controllers/authController.ts",
          status: "modified",
          additions: 5,
          deletions: 0,
          changes: 5,
          patch: `+router.post('/auth/login', (req, res) => { res.status(200).json({}); });`,
        },
        {
          filename: "src/components/Button.tsx",
          status: "modified",
          additions: 2,
          deletions: 0,
          changes: 2,
          patch: `+export const Button = () => <button>Click</button>;`,
        },
      ];

      const result = parseApiChangesFromFiles(files);
      expect(result.filesProcessed).toBe(1);
      expect(result.skippedFiles).toContain("src/components/Button.tsx");
      expect(result.totalRoutesIdentified).toBe(1);
      expect(result.changes[0].path).toBe("/auth/login");
    });
  });
});
