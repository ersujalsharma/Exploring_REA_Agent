# Naukri Apply Helper

A private Chrome extension that stores a small job seeker profile in Chrome's local extension storage and fills matching empty fields on Naukri pages when you click **Fill this page**.

## Install in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this repository folder.
4. Open a Naukri application page and click the extension icon.
5. Enter your profile, save it, then choose **Fill this page**.
6. Review the filled answers and submit the application yourself.

The extension does not send profile data to a server. It does not submit applications, bypass verification, or upload files. It only fills visible, empty text fields whose labels match supported profile fields. Naukri can change its page markup, so some fields may need to be entered manually.

## Included fields

Full name, email, phone, location, experience, current salary, expected salary, notice period, and key skills.
