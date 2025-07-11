import { Hono } from "hono";

import { logger } from "hono/logger";
import dynamicScrape from "./scraper";

export const routes = (app: Hono) => {
  app.use("*", logger());

  app.get("/health", (c) => {
    return c.json({
      uptime: process.uptime(),
      message: "Ok",
      date: new Date(),
    });
  });

  app.get("/", (c) => c.text("Tech Meetup Scraper API"));

  app.route("/api/scrape", dynamicScrape);
};
