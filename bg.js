import { CLAUDE_API_KEY } from "./config.js";

const CLAUDE_API_CONFIG = {
  url: "https://api.anthropic.com/v1/messages",
  model: "claude-sonnet-4-20250514",
  maxTokens: 2048,
  version: "2023-06-01",
};

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

Jobs:
{jobs}

Return JSON with "categories" array containing objects with "name" and "jobIds" fields.
`;

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "categorizeJobs") {
    categorizeJobs(request.jobs)
      .then((categories) => sendResponse({ success: true, categories }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const extractJSONFromResponse = (responseText) => {
  if (responseText.includes("```json")) {
    return responseText.split("```json")[1].split("```")[0].trim();
  }
  if (responseText.includes("```")) {
    return responseText.split("```")[1].split("```")[0].trim();
  }
  return responseText;
};

async function categorizeJobs(jobs) {
  const jobsText = jobs
    .map((job) => `ID: ${job.id}, Role: ${job.role}, Company: ${job.company}`)
    .join("\n");

  const prompt = CATEGORIZATION_PROMPT.replace("{jobs}", jobsText);

  const response = await fetch(CLAUDE_API_CONFIG.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": CLAUDE_API_CONFIG.version,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_API_CONFIG.model,
      max_tokens: CLAUDE_API_CONFIG.maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const jsonText = extractJSONFromResponse(data.content[0].text);
  const result = JSON.parse(jsonText);

  return result.categories;
}
