# 🕸️ Dynamic Web Scraper API with HonoJS + Puppeteer

A flexible, config-based web scraper built with [HonoJS](https://hono.dev/) and [Puppeteer](https://pptr.dev/).  
Send a target URL and CSS selector config via POST request, and receive the events scraped data in structured JSON.

---

## 🚀 Features

- 🧠 **Dynamic selector configuration** via JSON
- ⚡ Built with fast and lightweight [HonoJS](https://hono.dev/)
- 🧩 Uses headless Chromium via Puppeteer
- 🔐 Safe fallback if selectors are not found (returns `null`)
- ✅ Great for scraping tech events

---

## 📦 Tech Stack

- [HonoJS](https://hono.dev/) – Web framework
- [Puppeteer](https://pptr.dev/) – Headless browser automation
- [TypeScript](https://www.typescriptlang.org/) – Type safety

---

## 📥 API Usage

### `POST /api/scrape`

Scrapes data from the given `url` using the provided `fields` config (CSS selectors).

#### 🧾 Request Body

```json
{
  "url": "https://example.com/page",
  "fields": {
    "eventName": "#main > h1",
    "date": ".date",
    "location": ".location > p",
    "eventLink": "a.cta-link"
  }
}
```
