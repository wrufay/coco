// import api key
import { CLAUDE_API_KEY } from "./config.js";

//  open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// api calling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "categorizeJobs") {
    categorizeJobs(request.jobs)
      .then((categories) => {
        sendResponse({ success: true, categories });
      })
      .catch((error) => {
        // catch error
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function categorizeJobs(jobs) {
  // takes jobs array, asks claude to organize by category

  // organizing by role type for now - later can also do location or company
  const prompt = `
    Analyze these job descriptions and group them by role type.
    Rules for categorization:
  - Use SHORT category names (1-3 words max)
  - Use common abbreviations (SWE, PM, UI/UX, etc.)
  - Group similar roles together (don't over-split)
  - Keep categories broad enough to be useful (aim for 3-6 total categories)
  - Examples: "SWE", "Product", "Design", "Data", "DevOps"

    Jobs:
    ${jobs
      .map((job) => `ID: ${job.id}, Role: ${job.role}, Company: ${job.company}`)
      .join("\n")}

    Return JSON with "categories" array containing objects with "name" and "jobIds" fields.
    `;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();

  const responseText = data.content[0].text;

  // extract JSON
  let jsonText = responseText;
  if (responseText.includes("```json")) {
    // remove ```json at start and ``` at end
    jsonText = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    // remove ``` at start and ``` at end
    jsonText = responseText.split("```")[1].split("```")[0].trim();
  }

  // console.log("Background: Cleaned JSON text:", jsonText);

  const result = JSON.parse(jsonText);
  // console.log("Background: Parsed result:", result);
  return result.categories;
}
