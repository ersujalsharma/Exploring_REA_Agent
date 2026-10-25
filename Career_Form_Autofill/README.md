# Career Form Autofill

A standalone Chrome extension for filling common text fields on company career pages and job portals. Profile data is stored in Chrome's local extension storage on the current device.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `Career_Form_Autofill` folder.
5. Open a career application, open the extension, save your profile, and click **Fill this application**.

## LinkedIn Easy Apply

Open a LinkedIn job that shows **Easy Apply**, then select **LinkedIn: start & fill Easy Apply** in the extension. The extension clicks the visible Easy Apply control and fills supported fields in the first modal step. It never clicks **Next**, **Review**, or **Submit**; review each step and continue manually.

## Supported fields

First name, last name, full name, email, phone, location, LinkedIn URL, portfolio/website, experience, current salary, expected salary, notice period, and key skills. It uses visible labels, placeholders, field names, ARIA labels, and standard autocomplete values to identify fields.

## Boundaries

The extension intentionally does not submit forms, upload resumes, answer free-form or assessment questions, handle logins, or bypass CAPTCHAs. Review every populated answer and submit the application yourself.
