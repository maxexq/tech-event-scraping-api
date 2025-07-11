import { app } from "./app";

export default {
  ...app,
  port: process.env.PORT,
  idleTimeout: Number(process.env.IDLES_TIMEOUT),
};
