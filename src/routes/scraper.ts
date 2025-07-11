import { Hono } from "hono";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import z from "zod";

puppeteer.use(StealthPlugin());

const ScraperSchemaInput = z.object({
  url: z.url({
    message: "Invalid URL format",
  }),
  config: z.object({
    detailLinkSelector: z.string({
      message: "Detail link selector is required",
    }),
    detailLinkTextIncludes: z.string().optional(),
    isModal: z.boolean().optional(),
    modalClickSelector: z.string().optional(),
    modalWaitForSelector: z.string().optional(),
    fields: z.array(
      z.object({
        name: z.string(),
        selector: z.string().optional(),
        type: z.enum([
          "text",
          "link",
          "current_url",
          "clean_current_url",
          "attr",
        ]),
        nthChild: z.number().optional(),
        keywordIncludes: z.string().optional(),
        attr: z.string().optional(),
        joinWith: z.string().optional(),
        fallbackValue: z.string().optional(),
      })
    ),
  }),
});

export type ScrapeConfig = {
  detailLinkSelector: string;
  detailLinkTextIncludes?: string;
  isModal?: boolean;
  modalClickSelector?: string;
  modalWaitForSelector?: string;
  fields: {
    name: string;
    selector?: string;
    type: "text" | "link" | "current_url" | "clean_current_url" | "attr";
    nthChild?: number;
    keywordIncludes?: string;
    attr?: string;
    joinWith?: string;
    fallbackValue?: string;
  }[];
};

type ScrapeResult = Record<string, string | null>;

const scraper = new Hono();

scraper.post("/", async (c) => {
  const data = await c.req.json();

  const { url, config } = ScraperSchemaInput.parse(data);

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.waitForSelector(config.detailLinkSelector);

  const detailLinks = await page.$$eval(
    config.detailLinkSelector,
    (els, keyword) => {
      return els
        .filter((el) =>
          keyword
            ? el.textContent?.toLowerCase().includes(keyword.toLowerCase())
            : true
        )
        .map((el) => (el as HTMLAnchorElement).href);
    },
    config.detailLinkTextIncludes || ""
  );

  const results: ScrapeResult[] = [];

  for (const link of detailLinks) {
    if (
      config.isModal &&
      config.modalClickSelector &&
      config.modalWaitForSelector
    ) {
      try {
        const modalTriggers = await page.$$(config.modalClickSelector);

        for (const trigger of modalTriggers) {
          try {
            await trigger.click();
            await page.waitForSelector(config.modalWaitForSelector);

            const result: ScrapeResult = {};

            for (const field of config.fields) {
              const {
                name,
                type,
                selector = "",
                nthChild,
                attr,
                keywordIncludes,
                joinWith,
                fallbackValue,
              } = field;

              if (type === "current_url") {
                result[name] = page.url();
              }

              if (type === "clean_current_url") {
                const rawUrl = page.url();
                result[name] = rawUrl.split("?")[0];
              }

              if (type === "attr" && attr) {
                try {
                  const value = await page.$eval(
                    selector,
                    (el, attrName) => el.getAttribute(attrName as string),
                    attr
                  );
                  result[name] = value || fallbackValue || "";
                } catch {
                  result[name] = fallbackValue || "";
                }
              }

              if (type === "text") {
                const selectors = selector.split(",").map((s) => s.trim());
                const texts: string[] = [];

                for (const sel of selectors) {
                  const finalSelector = nthChild
                    ? `${sel}:nth-child(${nthChild})`
                    : sel;
                  try {
                    const text = await page.$eval(
                      finalSelector,
                      (el) => el.textContent?.trim() || ""
                    );
                    if (text) texts.push(text);
                  } catch {}
                }

                const joined = texts.join(joinWith || ", ");
                result[name] = joined || fallbackValue || "";
              }

              if (type === "link") {
                try {
                  const linkHref = await page.$$eval(
                    selector,
                    (links, keyword) => {
                      const el = links.find((el) =>
                        keyword
                          ? el.textContent
                              ?.toLowerCase()
                              .includes(keyword.toLowerCase())
                          : true
                      );
                      return el ? (el as HTMLAnchorElement).href : null;
                    },
                    keywordIncludes || ""
                  );
                  result[name] = linkHref;
                } catch {
                  result[name] = fallbackValue || null;
                }
              }
            }

            results.push(result);
            await page.keyboard.press("Escape");
          } catch (err) {
            console.warn("❌ Error scraping modal", err);
          }
        }
      } catch (err) {
        console.warn(`❌ Error scraping modal content for link: ${link}`, err);
      }
    } else {
      const detailPage = await browser.newPage();
      try {
        await detailPage.goto(link, { waitUntil: "domcontentloaded" });

        const result: ScrapeResult = {};

        for (const field of config.fields) {
          const {
            name,
            type,
            selector = "",
            nthChild,
            attr,
            keywordIncludes,
            joinWith,
            fallbackValue,
          } = field;

          if (type === "current_url") {
            result[name] = detailPage.url();
          }

          if (type === "clean_current_url") {
            const rawUrl = detailPage.url();
            result[name] = rawUrl.split("?")[0];
          }

          if (type === "attr" && attr) {
            try {
              const value = await detailPage.$eval(
                selector,
                (el, attrName) => el.getAttribute(attrName as string),
                attr
              );
              result[name] = value || fallbackValue || "";
            } catch {
              result[name] = fallbackValue || "";
            }
          }

          if (type === "text") {
            const selectors = selector.split(",").map((s) => s.trim());
            const texts: string[] = [];

            for (const sel of selectors) {
              const finalSelector = nthChild
                ? `${sel}:nth-child(${nthChild})`
                : sel;
              try {
                const text = await detailPage.$eval(
                  finalSelector,
                  (el) => el.textContent?.trim() || ""
                );
                if (text) texts.push(text);
              } catch {}
            }

            const joined = texts.join(joinWith || ", ");
            result[name] = joined || fallbackValue || "";
          }

          if (type === "link") {
            try {
              const linkHref = await detailPage.$$eval(
                selector,
                (links, keyword) => {
                  const el = links.find((el) =>
                    keyword
                      ? el.textContent
                          ?.toLowerCase()
                          .includes(keyword.toLowerCase())
                      : true
                  );
                  return el ? (el as HTMLAnchorElement).href : null;
                },
                keywordIncludes || ""
              );
              result[name] = linkHref;
            } catch {
              result[name] = fallbackValue || null;
            }
          }
        }

        results.push(result);
      } catch (err) {
        console.warn(`❌ Error at link: ${link}`, err);
      } finally {
        await detailPage.close();
      }
    }
  }

  await browser.close();

  return c.json({
    ok: true,
    data: results,
    total: results.length,
  });
});

export default scraper;
