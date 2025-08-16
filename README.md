# LocalStorage Auto-Setter

A simple and powerful browser extension for developers that automatically sets key-value pairs in `localStorage` for specified websites. Stop manually setting flags in dev tools and automate your testing and development workflow!

## Features

-   **Set-and-Forget Rules:** Create rules that automatically run every time you visit a matching page.
-   **Wildcard URL Matching:** Use wildcards (`*`) to easily target domains, subdomains, and paths (e.g., `https://*.myapp.com/admin/*`).
-   **Matched Rule Counter:** The extension icon shows a badge with the count of active rules matching the current page.
-   **Quick Add from Current Page:** Instantly populate a new rule's URL pattern based on the website you are currently visiting.
-   **Simple UI:** A clean and intuitive popup for adding, viewing, enabling/disabling, and deleting rules.
-   **Lightweight:** No unnecessary libraries or frameworks. It does one job and does it well.
-   **Privacy-Focused:** No data is ever collected or sent anywhere. All rules are stored locally in your browser.

## Why Would I Use This?

-   **Testing Preview/Staging Features:** Automatically set a flag like `adminMode` to `true` to see staging features on a live site.
-   **A/B Testing:** Force your browser into a specific test group by setting a storage item.
-   **Theme Toggling:** Automatically set a `theme` key to `dark` for specific development sites.
-   **Dismissing Banners:** Permanently dismiss annoying cookie banners or popups by setting the "dismissed" flag on every visit.

## Installation

#### 1. Install from the Chrome Web Store (Recommended)

[Link to your extension on the Chrome Web Store will go here]

#### 2. Install for Development (from source)

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/DarKnolo/LocalStorage-Auto-Setter.git
    ```
2.  Open your Chrome-based browser and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click on the **"Load unpacked"** button.
5.  Select the `localstorage-setter` directory that you just cloned.

## How to Use

1.  Click the extension icon in your browser toolbar to open the popup.
2.  Fill in the three fields:
    *   **URL Pattern:** The URL to target. You can click the "target" icon to automatically use a pattern for the current website. Wildcards (`*`) are supported.
    *   **LocalStorage Key:** The name of the key to set (e.g., `in-preview-mode`).
    *   **LocalStorage Value:** The value you want to set (e.g., `true`).
3.  Click **"Add Rule"**.
4.  Your rules will appear in the list below, grouped by "Enabled" and "Disabled" status. You can toggle, edit, or delete them from there.
5.  Navigate to a URL that matches the pattern. The extension will automatically set the item in your `localStorage` and the icon badge will update to show the number of matching rules. You can verify the result in your browser's developer tools (Application -> Local Storage).

## Contributing

Contributions are welcome! If you have ideas for new features, improvements, or have found a bug, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
