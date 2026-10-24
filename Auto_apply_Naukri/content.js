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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["FILL_PROFILE", "SHARE_INTEREST_IN_ALL"].includes(message?.type)) return;
  if (!location.hostname.endsWith("naukri.com")) {
    sendResponse({ error: "This helper only works on Naukri." });
    return;
  }
  if (message.type === "SHARE_INTEREST_IN_ALL") {
    sendResponse({ marked: shareInterestInAll() });
    return;
  }
  sendResponse({ filled: fill(message.profile || {}) });
});
