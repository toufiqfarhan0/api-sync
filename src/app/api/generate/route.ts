import { NextResponse } from "next/server";
import { generateDocUpdate } from "../../../lib/doc-generator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiChanges, docContexts, driftAnalysis, overrideTargetFile } = body;

    if (!apiChanges || !driftAnalysis) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: apiChanges and driftAnalysis are required." },
        { status: 400 }
      );
    }

    if (driftAnalysis.status === "NO_DRIFT") {
      return NextResponse.json(
        {
          success: true,
          generationResult: {
            success: true,
            format: "markdown",
            targetFile: docContexts?.[0]?.matchedFile || "README.md",
            generatedContent: "",
            summary: "No documentation update generated because no documentation drift was detected.",
            warnings: [],
            confidence: "HIGH",
          },
        },
        { status: 200 }
      );
    }

    const generationResult = await generateDocUpdate(
      {
        apiChanges,
        docContexts: docContexts || [],
        driftAnalysis,
      },
      { overrideTargetFile }
    );

    return NextResponse.json({
      success: true,
      generationResult,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred during documentation generation." },
      { status: 500 }
    );
  }
}
