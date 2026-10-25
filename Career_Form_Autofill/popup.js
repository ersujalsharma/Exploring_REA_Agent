const fields = ["firstName", "lastName", "fullName", "email", "phone", "location", "experience", "currentSalary", "expectedSalary", "noticePeriod", "linkedin", "website", "skills"];
const form = document.querySelector("#profile-form");
const status = document.querySelector("#status");

function profileFromForm() {
  return Object.fromEntries(fields.map((field) => [field, form.elements[field].value.trim()]));
}

function showStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function saveProfile() {
  await chrome.storage.local.set({ careerProfile: profileFromForm() });
}

async function loadProfile() {
  const { careerProfile = {} } = await chrome.storage.local.get("careerProfile");
  for (const field of fields) form.elements[field].value = careerProfile[field] || "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveProfile();
  showStatus("Profile saved on this device.");
});

document.querySelector("#fill-button").addEventListener("click", async () => {
  await saveProfile();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:\/\//i.test(tab.url || "")) {
    showStatus("Open a career application in a normal browser tab first.", true);
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "FILL_APPLICATION", profile: profileFromForm() });
    if (result?.filled) showStatus(`Filled ${result.filled} field${result.filled === 1 ? "" : "s"}. Review before submitting.`);
    else showStatus("No empty supported fields found on this page.");
  } catch {
    showStatus("Reload this page, then try again.", true);
  }
});

document.querySelector("#linkedin-easy-apply-button").addEventListener("click", async () => {
  await saveProfile();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(www\.)?linkedin\.com\//i.test(tab.url || "")) {
    showStatus("Open a LinkedIn job with Easy Apply first.", true);
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "START_LINKEDIN_EASY_APPLY", profile: profileFromForm() });
    if (result?.error) showStatus(result.error, true);
    else showStatus(`Easy Apply opened. Filled ${result?.filled || 0} field${result?.filled === 1 ? "" : "s"}; review before continuing.`);
  } catch {
    showStatus("Reload the LinkedIn tab, then try again.", true);
  }
});

loadProfile();
