# Debra's Deals Inventory System

A mobile-friendly inventory and sales tracking web app built with HTML, CSS, and JavaScript.

## Features
- Add, edit, and manage products by SKU
- Inventory tracking with quantity deduction on sale
- Excel spreadsheet import across all workbook tabs
- Hyperlink support for product URLs
- Inventory keyword fallback search against linked Item Title URL content (🌐 indicator for remote matches)
- Location search and optional sorting by location
- Sales tracking with revenue and profit calculations
- iOS-friendly responsive design

## Files
- `index.html` - app UI and page layout
- `styles.css` - responsive styles for desktop and mobile
- `script.js` - app logic, localStorage persistence, spreadsheet import, sales flow
- `.gitignore` - ignored local spreadsheet and temporary files
- `.nojekyll` - GitHub Pages support file

## Local usage
1. Install server dependency:
   ```bash
   npm install
   ```
2. Start the app server (serves the frontend and `/proxy/fetch` endpoint for URL-content search):
   ```bash
   npm start
   ```
3. Visit `http://localhost:4000` in your browser.
4. Optional static-only mode (without proxy URL-content search):
   ```bash
   cd c:\Users\jesus\Documents\debras-deals-inventory-system
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`.

## GitHub deployment
1. Create the repository on GitHub: `Gaviola-Consulting-LLC/debras-deals-inventory-system`
2. Push the local `main` branch:
   ```bash
   git push -u origin main
   ```
3. Enable GitHub Pages in the repository settings using the `main` branch root.

## Expected GitHub Pages URL
`https://gaviola-consulting-llc.github.io/debras-deals-inventory-system/`

## Notes
- The app stores data in `localStorage`, so inventory and sales persist per browser.
- The app does not require a password. A valid license key is requested once per browser/device, stored in `localStorage`, and then checked silently on later visits.
- If you update app files and still see old content, refresh the browser cache or open in a private window.
