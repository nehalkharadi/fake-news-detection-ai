# TruthShield AI

TruthShield AI is a frontend-only fake news detection system with a dark 3D animated interface. It analyzes a headline, article text, and optional source URL directly in the browser, then returns an explainable credibility score with risks and recommendations.

## Features

- Pure frontend detection engine in JavaScript
- Explainable signal breakdown instead of a black-box result
- Dark cinematic UI with 3D cube animation and glass panels
- Browser-side analysis with no page reload
- Demo samples for trusted, suspicious, and mixed stories

## Project Structure

- `index.html` - main frontend entry point
- `index.php` - same frontend page for optional server hosting
- `assets/css/style.css` - dark 3D styling
- `assets/js/app.js` - frontend logic and animations

## Run Locally

Open `index.html` directly in any modern browser.

You can also serve the folder with any static server if you want, but it is not required.

## How Detection Works

SignalMatrix AI uses local, explainable browser-side heuristics inspired by credibility analysis models:

- source reputation
- evidence and attribution language
- sensational keywords
- conspiracy-style wording
- all-caps and punctuation intensity
- article length and structure
- numbers, dates, and quotes

## Note

This project is a smart screening tool, not a replacement for professional fact-checking or newsroom verification.
