/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import("next").NextConfig} */
const config = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  devIndicators: false,
};

export default config;
