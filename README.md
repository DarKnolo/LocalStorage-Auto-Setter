# Autostash

A simple and powerful browser extension for developers that automatically sets localStorage values or creates URL redirects for specified websites. Stop manually setting flags in dev tools and automate your testing and development workflow!

## Features

-   **Set-and-Forget Rules:** Create rules that automatically run every time you visit a matching page.
-   **Two Core Actions:** Set items in **LocalStorage** or set up **URL Redirects**.
-   **Wildcard URL Matching:** Use wildcards (`*`) to easily target domains, subdomains, and paths (e.g., `*.myapp.com/admin/*`).
-   **Smart Suggestions:** Auto-populate new rules by pulling existing keys and values from the current page's localStorage.
-   **Matched Rule Counter:** The extension icon shows a badge with the count of active rules matching the current page.
-   **Simple UI:** A clean and intuitive popup for adding, viewing, enabling/disabling, and deleting rules.
-   **Privacy-Focused:** No data is ever collected or sent anywhere. All rules are stored locally in your browser.

## Why Would I Use This?

-   **Testing Preview Features:** Automatically set a flag like `adminMode` to `true` to see staging features on a live site.
-   **A/B Testing:** Force your browser into a specific test group by setting a localStorage item.
-   **API Environment Switching:** Use a redirect rule to send requests for `production-api.com/*` to `localhost:8080/*` during development.
-   **Simplifying URLs:** Automatically redirect from a base URL like `myapp.com` to a specific dashboard page like `myapp.com/dashboard/home`.
-   **Dismissing Banners:** Permanently dismiss annoying popups by setting the "dismissed" flag in localStorage on every visit.

## Installation

#### 1. Install from the Chrome Web Store (Recommended)

[Link to your extension on the Chrome Web Store will go here]

#### 2. Install for Development (from source)

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/DarKnolo/Autostash.git
    ```
2.  Open your Chrome-based browser and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click on the **"Load unpacked"** button.
5.  Select the `autostash` directory that you just cloned.

## How to Use

1.  Click the extension icon in your browser toolbar to open the popup.
2.  Select the action you want to perform: `LocalStorage` or `Redirects`.
3.  Fill in the fields. Use the "target" icon to get URL suggestions or the "list" icon to get key/value suggestions from the current page.
4.  Click **"Add Rule"**.
5.  Your rules will appear in the list below. You can toggle, edit, duplicate, or delete them from there.
6.  Navigate to a URL that matches the pattern. The extension will automatically perform the action, and the icon badge will update to show the number of matching rules.

## Contributing

Contributions are welcome! If you have ideas for new features, improvements, or have found a bug, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
