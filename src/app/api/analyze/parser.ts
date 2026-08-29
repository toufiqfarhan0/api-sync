export function parseGitHubUrlOrInput(input: string, prInput?: string | number): { owner: string; repo: string; pullNumber: number } {
  const trimmed = input.trim();
  
  // Handle full PR URL e.g., https://github.com/owner/repo/pull/12
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      pullNumber: parseInt(urlMatch[3], 10),
    };
  }

  // Handle owner/repo format
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    const owner = parts[0].trim();
    const repo = parts[1].trim();
    const num = typeof prInput === "number" ? prInput : parseInt(String(prInput || "").trim(), 10);

    if (owner && repo && !isNaN(num) && num > 0) {
      return { owner, repo, pullNumber: num };
    }
  }

  throw new Error("Invalid GitHub input. Provide a PR URL (e.g., https://github.com/owner/repo/pull/1) or owner/repo and PR number.");
}
