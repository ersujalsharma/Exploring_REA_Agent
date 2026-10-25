const fieldMatchers = {
  firstName: [/first\s*name/, /given\s*name/],
  lastName: [/last\s*name/, /family\s*name/, /surname/],
  fullName: [/full\s*name/, /candidate\s*name/, /your\s*name/, /^name$/],
  email: [/e[-\s]?mail/],
  phone: [/phone/, /mobile/, /telephone/, /contact\s*number/],
  location: [/current\s*location/, /current\s*city/, /city/, /location/],
  linkedin: [/linkedin/, /linked\s*in/],
  website: [/portfolio/, /personal\s*(website|site)/, /github/, /website/, /web\s*site/],
  experience: [/total\s*experience/, /work\s*experience/, /years?\s*of\s*experience/, /experience/],
  currentSalary: [/current\s*(ctc|salary|compensation)/, /present\s*(ctc|salary|compensation)/],
  expectedSalary: [/expected\s*(ctc|salary|compensation)/, /desired\s*(ctc|salary|compensation)/, /salary\s*expectation/],
  noticePeriod: [/notice\s*period/, /joining\s*period/, /availability/],
  skills: [/key\s*skills/, /technical\s*skills/, /^skills$/, /technology/, /expertise/]
};

const autocompleteMatchers = {
  firstName: ["given-name"],
  lastName: ["family-name"],
  fullName: ["name"],
  email: ["email"],
  phone: ["tel"],
  website: ["url"]
};

function visible(element) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function fieldDescription(element) {
  const text = [];
  if (element.labels) text.push(...[...element.labels].map((label) => label.innerText));
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) text.push(label.innerText);
  }
  const labelledBy = (element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
  text.push(...labelledBy.map((id) => document.getElementById(id)?.innerText));
  const wrapper = element.closest("label, .field, .form-group, .formField, [class*='field'], [class*='Field']");
  if (wrapper) text.push(wrapper.innerText);
  text.push(element.getAttribute("aria-label"), element.getAttribute("placeholder"), element.name, element.id);
  return text.filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ");
}

function normalizedProfile(profile) {
  const result = { ...profile };
  const fullName = (profile.fullName || "").trim();
  const firstName = (profile.firstName || "").trim();
  const lastName = (profile.lastName || "").trim();
  if (!fullName && (firstName || lastName)) result.fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName && !firstName) result.firstName = fullName.split(/\s+/)[0];
  if (fullName && !lastName) result.lastName = fullName.split(/\s+/).slice(1).join(" ");
  return result;
}

function profileFieldFor(element, profile) {
  const description = fieldDescription(element);
  const autocomplete = (element.autocomplete || "").toLowerCase().split(/\s+/);
  return Object.keys(fieldMatchers).find((key) => profile[key] && (
    fieldMatchers[key].some((matcher) => matcher.test(description)) ||
    (autocompleteMatchers[key] || []).some((token) => autocomplete.includes(token))
  ));
}

function setInputValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSelectValue(element, value) {
  const target = String(value).trim().toLowerCase();
  const option = [...element.options].find((item) => item.value.trim().toLowerCase() === target || item.text.trim().toLowerCase() === target);
  if (!option) return false;
  element.value = option.value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function fillApplication(profile) {
  const values = normalizedProfile(profile);
  let filled = 0;
  const controls = [...document.querySelectorAll("input:not([type]), input[type='text'], input[type='email'], input[type='tel'], input[type='number'], input[type='url'], textarea, select")]
    .filter((element) => !element.disabled && !element.readOnly && visible(element));

  for (const element of controls) {
    if (element instanceof HTMLSelectElement ? element.selectedIndex > 0 : element.value.trim()) continue;
    const key = profileFieldFor(element, values);
    if (!key) continue;
    if (element instanceof HTMLSelectElement) {
      if (setSelectValue(element, values[key])) filled += 1;
    } else {
      setInputValue(element, values[key]);
      filled += 1;
    }
  }
  return filled;
}

function buttonLabels(element) {
  return [element.innerText, element.textContent, element.getAttribute("aria-label"), element.getAttribute("title")]
    .filter(Boolean)
    .map((text) => text.replace(/\s+/g, " ").trim().toLowerCase());
}

function startLinkedInEasyApply() {
  if (!location.hostname.endsWith("linkedin.com")) return { error: "Open a LinkedIn job with Easy Apply first." };
  const easyApply = [...document.querySelectorAll("button, [role='button']")].find((element) =>
    !element.disabled && visible(element) && buttonLabels(element).some((label) => label === "easy apply")
  );
  if (!easyApply) return { error: "No visible Easy Apply button was found for this job." };

  easyApply.click();
  return { started: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FILL_APPLICATION") {
    sendResponse({ filled: fillApplication(message.profile || {}) });
    return;
  }
  if (message?.type === "START_LINKEDIN_EASY_APPLY") {
    const result = startLinkedInEasyApply();
    if (result.error) {
      sendResponse(result);
      return;
    }
    window.setTimeout(() => sendResponse({ ...result, filled: fillApplication(message.profile || {}) }), 800);
    return true;
  }
});
