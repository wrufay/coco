const CLAUDE_API_CONFIG = {
  url: "https://api.anthropic.com/v1/messages",
  model: "claude-sonnet-4-5-20250929",
  version: "2023-06-01",
};

// API Key Management
async function getApiKey() {
  const result = await chrome.storage.local.get(["claudeApiKey"]);
  return result.claudeApiKey;
}

async function setApiKey(apiKey) {
  await chrome.storage.local.set({ claudeApiKey: apiKey });
}

async function deleteApiKey() {
  await chrome.storage.local.remove(["claudeApiKey"]);
}

// Error Classification
function classifyAnthropicError(response, data, networkError) {
  if (networkError) {
    return {
      kind: "network",
      message: "Couldn't reach Anthropic — check your internet connection.",
    };
  }

  const rawMessage = data?.error?.message || "";

  if (response?.status === 401) {
    return {
      kind: "invalid_key",
      message: "Your API key looks invalid or has been revoked.",
    };
  }

  if (response?.status === 400 && rawMessage.toLowerCase().includes("credit balance")) {
    return {
      kind: "out_of_credits",
      message:
        "You're out of Anthropic credits — top up at console.anthropic.com/settings/billing.",
    };
  }

  if (response?.status === 429) {
    return {
      kind: "rate_limited",
      message: "Anthropic is rate-limiting this key right now — try again shortly.",
    };
  }

  if (response?.status >= 500) {
    return {
      kind: "server_error",
      message: "Anthropic's API is having issues — try again shortly.",
    };
  }

  return {
    kind: "unknown",
    message: rawMessage || "Something went wrong talking to Anthropic.",
  };
}

const CATEGORIZATION_PROMPT = `
Analyze these job descriptions and group them by role type.
Rules for categorization:
- Use SHORT category names (1-3 words max)
- Use common abbreviations (SWE, PM, UI/UX, etc.)
- Make distinctions between different but similar roles
- Keep categories broad enough to be useful (aim for 3-6 total categories)
- Try not to have more than 6-7 jobs in one category
- Examples: "SWE", "Product", "Design", "Data", "Other"
- Make sure to consider other industries and careers as well, do not classify non-tech jobs as tech
{existingCategoriesNote}

Jobs:
{jobs}
`;

// Side Panel Setup
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Message Handler
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "extractJobInfo") {
    extractJobInfo(request.pageText)
      .then((jobInfo) => sendResponse({ success: true, jobInfo }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "categorizeJobs") {
    categorizeJobs(request.jobs, request.existingCategories || [])
      .then((categories) => sendResponse({ success: true, categories }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "analyzeResume") {
    analyzeResume(request.resumeText, request.jobs)
      .then((analysis) => sendResponse({ success: true, analysis }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "deleteApiKey") {
    deleteApiKey()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "validateApiKey") {
    validateApiKey(request.apiKey)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          success: false,
          error: { kind: "unknown", message: error.message },
        })
      );
    return true;
  }
});

async function validateApiKey(apiKey) {
  let response;
  let data;

  try {
    response = await fetch(CLAUDE_API_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": CLAUDE_API_CONFIG.version,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_API_CONFIG.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    data = await response.json();
  } catch (networkError) {
    return { success: false, error: classifyAnthropicError(null, null, true) };
  }

  if (!response.ok) {
    return { success: false, error: classifyAnthropicError(response, data, false) };
  }

  await setApiKey(apiKey);
  return { success: true };
}

// Tool Schemas
const EXTRACT_JOB_TOOL = {
  name: "extract_job_info",
  description: "Extract structured job posting information from webpage text.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      company: { type: "string" },
      location: {
        type: "string",
        description: "City, State/Province only, e.g. 'Vancouver, BC'",
      },
      type: { type: "string", enum: ["Remote", "Hybrid", "On-site"] },
      deadline: {
        type: "string",
        description: "YYYY-MM-DD or empty string if not found",
      },
      requirements: {
        type: "string",
        description: "Key qualifications, separated by blank lines",
      },
    },
    required: ["title", "company", "location", "type", "deadline", "requirements"],
  },
};

const CATEGORIZE_JOBS_TOOL = {
  name: "categorize_jobs",
  description: "Group job listings into short role-type categories.",
  input_schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short category name, 1-3 words" },
            jobIds: { type: "array", items: { type: "integer" } },
          },
          required: ["name", "jobIds"],
        },
      },
    },
    required: ["categories"],
  },
};

// Shared tool-use call with classification + limited retry
async function callClaudeTool({ apiKey, prompt, tool, maxTokens, retries = 1 }) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    let data;

    try {
      response = await fetch(CLAUDE_API_CONFIG.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": CLAUDE_API_CONFIG.version,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: CLAUDE_API_CONFIG.model,
          max_tokens: maxTokens,
          tools: [tool],
          tool_choice: { type: "tool", name: tool.name },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      data = await response.json();
    } catch (networkError) {
      const classified = classifyAnthropicError(null, null, true);
      if (attempt < retries) continue;
      throw new Error(classified.message);
    }

    if (!response.ok) {
      const classified = classifyAnthropicError(response, data, false);
      if (attempt < retries && (classified.kind === "network" || classified.kind === "server_error")) {
        continue;
      }
      throw new Error(classified.message);
    }

    const toolUseBlock = data.content?.find((block) => block.type === "tool_use");
    if (!toolUseBlock) {
      if (attempt < retries) continue;
      throw new Error("Claude did not return the expected structured response.");
    }

    return toolUseBlock.input;
  }
}

// API Functions
async function extractJobInfo(pageText) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set your Claude API key.");
  }

  const prompt = `Extract job info from this webpage content.

Page content:
${pageText.substring(0, 3000)}`;

  const parsed = await callClaudeTool({
    apiKey,
    prompt,
    tool: EXTRACT_JOB_TOOL,
    maxTokens: 1024,
  });

  // Ensure type field exists (defense-in-depth even with the enum constraint)
  if (!parsed.type) {
    if (parsed.location && parsed.location.toLowerCase().includes("remote")) {
      parsed.type = "Remote";
    } else if (parsed.location && /\(([^)]+)\)/.test(parsed.location)) {
      const match = parsed.location.match(/\(([^)]+)\)/);
      if (match) {
        parsed.type = match[1];
        parsed.location = parsed.location.replace(/\s*\([^)]+\)/, "");
      }
    } else {
      parsed.type = "On-site";
    }
  }

  if (!parsed.requirements) {
    parsed.requirements = "";
  }

  return parsed;
}

async function categorizeJobs(jobs, existingCategories = []) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set your Claude API key.");
  }

  const jobsText = jobs
    .map((job) => `ID: ${job.id}, Role: ${job.role}, Company: ${job.company}`)
    .join("\n");

  const existingCategoriesNote =
    existingCategories.length > 0
      ? `- Prefer reusing one of these existing category names when a job fits: ${existingCategories.join(", ")}`
      : "";

  const prompt = CATEGORIZATION_PROMPT.replace("{jobs}", jobsText).replace(
    "{existingCategoriesNote}",
    existingCategoriesNote
  );

  const result = await callClaudeTool({
    apiKey,
    prompt,
    tool: CATEGORIZE_JOBS_TOOL,
    maxTokens: 2048,
  });

  return Array.isArray(result.categories) ? result.categories : [];
}

async function analyzeResume(resumeText, jobs) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set your Claude API key.");
  }

  const wishlistJobs = jobs.filter((job) => job.status === "Wishlist");

  const jobsText =
    wishlistJobs.length > 0
      ? wishlistJobs
          .map(
            (job) =>
              `- ${job.role} at ${job.company}\n  Requirements: ${
                job.notes || "Not specified"
              }`
          )
          .join("\n\n")
      : "No jobs in wishlist yet.";

  const allJobsText =
    jobs.length > 0
      ? jobs
          .map(
            (job) =>
              `- [${job.status}] ${job.role} at ${
                job.company
              }\n  Requirements: ${job.notes || "Not specified"}`
          )
          .join("\n\n")
      : "No jobs saved yet.";

  const prompt = `You are a career advisor. Analyze this resume against the job listings to create a focused action plan.

RESUME:
${resumeText.substring(0, 8000)}

WISHLIST JOBS:
${jobsText}

ALL JOBS:
${allJobsText}

Provide a BRIEF, ACTION-FOCUSED response with:

1. TOP SKILLS TO LEARN (max 5 skills):
   - List ONLY the most impactful skills ranked by demand
   - Format: "<strong>Skill Name</strong> - Required by X/${
     wishlistJobs.length
   } wishlist jobs"
   - Be specific (e.g., "React.js" not "JavaScript frameworks")

2. YOUR ACTION PLAN (3-4 specific next steps):
   - Brief, actionable items the user should do NOW
   - Focus on high-impact actions
   - Add a <br> tag before the "YOUR ACTION PLAN" header for spacing

Keep the ENTIRE response under 150 words. Use HTML: <h3> for headers, <ul><li> for lists, <strong> for emphasis. Make it scannable and punchy.`;

  const response = await fetch(CLAUDE_API_CONFIG.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": CLAUDE_API_CONFIG.version,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_API_CONFIG.model,
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `API error: ${response.status}`);
  }

  if (!data.content || !data.content[0]) {
    throw new Error("Invalid response format from API");
  }

  return data.content[0].text;
}
