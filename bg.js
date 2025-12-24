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
  if (request.action === "extractJobInfo") {
    extractJobInfo(request.pageText)
      .then((jobInfo) => sendResponse({ success: true, jobInfo }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }
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

async function extractJobInfo(pageText) {
  const prompt = `Extract job information from this webpage text and return it as JSON.

Page content:
${pageText.substring(0, 6000)}

You MUST return valid JSON with exactly these 6 fields: title, company, location, type, deadline, requirements

Example output:
{
  "title": "Software Engineer",
  "company": "Google",
  "location": "Vancouver, BC",
  "type": "On-site",
  "deadline": "2025-01-15",
  "requirements": "Bachelor's degree in Computer Science or related field\\n\\n3+ years of experience with Python and JavaScript\\n\\nStrong knowledge of web frameworks like React and Django\\n\\nExperience with cloud platforms (AWS, GCP)\\n\\nExcellent problem-solving and communication skills"
}

Field rules:
- title: The job title/role
- company: The company name
- location: City and state/province ONLY (e.g., "Vancouver, BC" or "San Francisco, CA"). If location says "Vancouver, BC (On-site)", extract ONLY "Vancouver, BC"
- type: Must be exactly one of these three words: "Remote", "Hybrid", or "On-site"
- deadline: Application deadline in YYYY-MM-DD format (e.g., "2025-01-15"). If no deadline is mentioned, use empty string ""
- requirements: Extract what is required of the applicant (qualifications, skills, experience, education, certifications). Format as separate points with \\n\\n (double newline) between each requirement. Keep it concise and focused on the essentials.

All fields are REQUIRED. Always include all 6 fields.

Return ONLY the JSON object with all 6 fields.`;

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
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const jsonText = extractJSONFromResponse(data.content[0].text);
  const parsed = JSON.parse(jsonText);

  // Ensure type field exists, try to infer from location if missing
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

  // Ensure requirements field exists
  if (!parsed.requirements) {
    parsed.requirements = "";
  }

  return parsed;
}

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
