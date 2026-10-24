const fields = ["fullName", "email", "phone", "location", "experience", "currentSalary", "expectedSalary", "noticePeriod", "skills"];
const form = document.querySelector("#profile-form");
const status = document.querySelector("#status");

function showStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function readForm() {
  return Object.fromEntries(fields.map((name) => [name, form.elements[name].value.trim()]));
}

async function loadProfile() {
  const stored = await chrome.storage.local.get("profile");
  const profile = stored.profile || {};
  for (const name of fields) form.elements[name].value = profile[name] || "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({ profile: readForm() });
  showStatus("Profile saved on this device.");
});

document.querySelector("#fill-button").addEventListener("click", async () => {
  const profile = readForm();
  await chrome.storage.local.set({ profile });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(www\.)?naukri\.com\//i.test(tab.url || "")) {
    showStatus("Open a Naukri application page first.", true);
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "FILL_PROFILE", profile });
    if (result?.error) showStatus(result.error, true);
    else showStatus(`Filled ${result?.filled || 0} field${result?.filled === 1 ? "" : "s"}. Review before submitting.`);
  } catch {
    showStatus("Reload the Naukri tab, then try again.", true);
  }
});

document.querySelector("#share-interest-button").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(www\.)?naukri\.com\//i.test(tab.url || "")) {
    showStatus("Open a Naukri jobs page first.", true);
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "SHARE_INTEREST_IN_ALL" });
    if (result?.error) showStatus(result.error, true);
    else if (result?.marked) showStatus(`Marked interest in ${result.marked} visible job${result.marked === 1 ? "" : "s"}.`);
    else showStatus("No visible Share Interest buttons found.");
  } catch {
    showStatus("Reload the Naukri tab, then try again.", true);
  }
});

loadProfile();
