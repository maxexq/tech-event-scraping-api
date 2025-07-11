import { Hono } from "hono";
import { routes } from "./routes";
import { z } from "zod/v4";

const app = new Hono();

routes(app);

app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    const errors = z.flattenError(error);

    return c.json({ error: errors, message: "ZodError" }, 400);
  }

  console.error(error);

  return c.json(
    { error, message: error.message || "Custom Error Message" },
    500
  );
});

app.notFound((c) => {
  return c.text("404 Not found", 404);
});

export { app };
