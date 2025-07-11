import puppeteer from "puppeteer";

type ScrapeConfig = {
  url: string;
  fields: Record<string, string>; // key: field name, value: CSS selector
};

export async function dynamicScrape(
  config: ScrapeConfig
): Promise<Record<string, string | null>> {
  const browser = await puppeteer.launch({ headless: "shell" });
  const page = await browser.newPage();

  await page.goto(config.url, { waitUntil: "domcontentloaded" });

  const result: Record<string, string | null> = {};

  for (const [fieldName, selector] of Object.entries(config.fields)) {
    try {
      const value = await page.$eval(
        selector,
        (el) => el.textContent?.trim() || ""
      );
      result[fieldName] = value;
    } catch {
      result[fieldName] = null; // ถ้า selector ไม่เจอ
    }
  }

  await browser.close();
  return result;
}
