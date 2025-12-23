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
    Keep the categories as brief as possible, with no parenthesis or additional information
    Use abbreviations when possible, such as "swe" for "software engineering" to sound more quirky and gen-z.
    Make distinctions between similar roles such as "software development" and "software engineering".
    Your job is to make the roles as easy as possible for the user to navigate.

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
