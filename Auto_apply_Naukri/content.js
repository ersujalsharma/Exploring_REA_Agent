const fieldHints = {
  fullName: [/full.?name/, /candidate.?name/, /your.?name/, /^name$/],
  email: [/e.?mail/],
  phone: [/phone/, /mobile/, /contact.?number/, /telephone/],
  location: [/location/, /current.?city/, /city/],
  experience: [/total.?experience/, /work.?experience/, /years.?of.?experience/, /experience/],
  currentSalary: [/current.?ctc/, /current.?salary/, /present.?salary/, /current.?compensation/],
  expectedSalary: [/expected.?ctc/, /expected.?salary/, /salary.?expectation/, /expected.?compensation/],
  noticePeriod: [/notice.?period/, /availability/, /joining.?period/],
  skills: [/key.?skills/, /skills/, /technology/, /expertise/]
};

function labelFor(element) {
  const pieces = [element.labels ? [...element.labels].map((label) => label.innerText).join(" ") : ""];
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) pieces.push(label.innerText);
  }
  const parent = element.closest("label");
  if (parent) pieces.push(parent.innerText);
  const container = element.closest(".form-group, .field, .formField, [class*='field'], [class*='Field']");
  if (container) pieces.push(container.innerText);
  pieces.push(element.getAttribute("aria-label"), element.getAttribute("placeholder"), element.name, element.id);
  return pieces.filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ");
}

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function fill(profile) {
  let filled = 0;
  const controls = [...document.querySelectorAll("input:not([type]), input[type='text'], input[type='email'], input[type='tel'], input[type='number'], textarea")]
    .filter((element) => !element.disabled && !element.readOnly && element.getClientRects().length);

  for (const element of controls) {
    if (element.value.trim()) continue;
    const label = labelFor(element);
    const key = Object.keys(fieldHints).find((field) => profile[field] && fieldHints[field].some((hint) => hint.test(label)));
    if (!key) continue;
    setNativeValue(element, profile[key]);
    filled += 1;
  }
  return filled;
}

function buttonLabels(element) {
  return [
    element.innerText,
    element.textContent,
    element.getAttribute("aria-label"),
    element.getAttribute("title")
  ].filter(Boolean).map((text) => text.replace(/\s+/g, " ").trim().toLowerCase());
}

function shareInterestButtons() {
  return [...document.querySelectorAll("button, [role='button'], a")].filter((element) => {
    const isShareInterest = buttonLabels(element).some((text) => text === "share interest");
    return isShareInterest &&
      !element.disabled &&
      element.getAttribute("aria-disabled") !== "true" &&
      element.getClientRects().length > 0;
  });
}

function shareInterestInAll() {
  const buttons = shareInterestButtons();
  for (const button of buttons) {
    button.click();
  }
  return buttons.length;
}

const basicDetailsTaskKey = "naukriBasicDetailsSaveTask";
let basicDetailsTimer;

function visible(element) {
  return element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function saveBasicDetailsTask(task) {
  return chrome.storage.local.set({ [basicDetailsTaskKey]: { ...task, updatedAt: Date.now() } });
}

function profileViewButton() {
  return [...document.querySelectorAll("button, a, [role='button']")].find((element) =>
    visible(element) && buttonLabels(element).some((label) => label === "view profile")
  );
}

function basicDetailsEditButton() {
  const targets = [...document.querySelectorAll("button, a, [role='button'], [aria-label*='edit' i], [title*='edit' i], [class*='edit' i]")];
  const candidates = targets.map((element) => element.closest("button, a, [role='button']") || element).filter((element, index, all) => {
    if (all.indexOf(element) !== index) return false;
    const label = buttonLabels(element).join(" ");
    const top = element.getBoundingClientRect().top;
    const editLike = /\bedit\b/.test(label) || /edit/i.test(`${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""} ${element.className || ""}`);
    return visible(element) && top > 80 && top < 500 && editLike;
  });
  return candidates.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0];
}

function basicDetailsModal() {
  return [...document.querySelectorAll("[role='dialog'], .modal, [class*='modal']")].find((element) =>
    visible(element) && /basic details/i.test(element.innerText || "")
  );
}

function modalSaveButton(modal) {
  return [...modal.querySelectorAll("button, input[type='submit'], [role='button']")].find((element) =>
    visible(element) && !element.disabled && buttonLabels(element).some((label) => label === "save")
  );
}

function scheduleBasicDetailsTask(delay = 400) {
  clearTimeout(basicDetailsTimer);
  basicDetailsTimer = setTimeout(processBasicDetailsTask, delay);
}

async function processBasicDetailsTask() {
  const { [basicDetailsTaskKey]: task } = await chrome.storage.local.get(basicDetailsTaskKey);
  if (!task || task.status !== "running") return;
  if (Date.now() - task.startedAt > 30000) {
    await saveBasicDetailsTask({ ...task, status: "stopped", message: "Timed out before the Basic details modal was ready." });
    return;
  }

  if (task.stage === "open-profile") {
    const viewProfile = profileViewButton();
    if (!viewProfile) return scheduleBasicDetailsTask(600);
    await saveBasicDetailsTask({ ...task, stage: "open-editor", message: "Opening your Naukri profile…" });
    viewProfile.click();
    return scheduleBasicDetailsTask(1000);
  }

  if (task.stage === "open-editor") {
    const editButton = basicDetailsEditButton();
    if (!editButton) return scheduleBasicDetailsTask(600);
    await saveBasicDetailsTask({ ...task, stage: "save", message: "Opening Basic details…" });
    editButton.click();
    return scheduleBasicDetailsTask(700);
  }

  if (task.stage === "save") {
    const modal = basicDetailsModal();
    if (!modal) return scheduleBasicDetailsTask(500);
    const saveButton = modalSaveButton(modal);
    if (!saveButton) {
      await saveBasicDetailsTask({ ...task, status: "stopped", message: "Basic details opened, but its Save button was not available." });
      return;
    }
    await saveBasicDetailsTask({ ...task, stage: "waiting-for-save", message: "Saving Basic details without changing fields…" });
    saveButton.click();
    return scheduleBasicDetailsTask(700);
  }

  if (task.stage === "waiting-for-save") {
    if (basicDetailsModal()) return scheduleBasicDetailsTask(500);
    await saveBasicDetailsTask({ ...task, status: "complete", message: "Basic details saved. No profile fields were changed." });
  }
}

async function startBasicDetailsSave() {
  await saveBasicDetailsTask({ status: "running", stage: "open-profile", startedAt: Date.now(), message: "Starting Basic details save…" });
  scheduleBasicDetailsTask(0);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["FILL_PROFILE", "SHARE_INTEREST_IN_ALL", "SAVE_BASIC_DETAILS"].includes(message?.type)) return;
  if (!location.hostname.endsWith("naukri.com")) {
    sendResponse({ error: "This helper only works on Naukri." });
    return;
  }
  if (message.type === "SHARE_INTEREST_IN_ALL") {
    sendResponse({ marked: shareInterestInAll() });
    return;
  }
  if (message.type === "SAVE_BASIC_DETAILS") {
    startBasicDetailsSave().then(() => sendResponse({ started: true }));
    return true;
  }
  sendResponse({ filled: fill(message.profile || {}) });
});

chrome.storage.local.get(basicDetailsTaskKey).then(({ [basicDetailsTaskKey]: task }) => {
  if (task?.status === "running") scheduleBasicDetailsTask(200);
});
