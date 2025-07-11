import { Config } from "./node_modules/.pnpm/cosmiconfig@9.0.0/node_modules/cosmiconfig/dist/types.d";
// index.ts
import { Hono } from "hono";
import { dynamicScrape, ScrapeConfig } from "./scraper";

const app = new Hono();

app.get("/", (c) => c.text("Tech Meetup Scraper API"));

app.post("/api/scrape", async (c) => {
  const body = await c.req.json();
  const method = c.req.method;

  if (method !== "POST") {
    return c.json({ error: "Method not allowed" }, 405);
  }

  if (!body.url || !body.config) {
    return c.json({ error: "Missing url or fields config" }, 400);
  }

  const config: ScrapeConfig = {
    detailLinkSelector: body.config.detailLinkSelector || "a",
    detailLinkTextIncludes: body.config.detailLinkTextIncludes || "",
    isModal: body.config.isModal || false,
    modalClickSelector: body.config.modalClickSelector || "",
    modalWaitForSelector: body.config.modalWaitForSelector || "",
    fields: body.config.fields.map((field: any) => ({
      name: field.name,
      selector: field.selector || "",
      type: field.type || "text",
      nthChild: field.nthChild || undefined,
      keywordIncludes: field.keywordIncludes || "",
      attr: field.attr || "",
      joinWith: field.joinWith || ", ",
      fallbackValue: field.fallbackValue || "",
    })),
  };

  try {
    const result = await dynamicScrape(body.url, config);
    return c.json({
      ok: true,
      data: result,
      total: result.length,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 120, // 120 seconds
};
