/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url"

import { createJiti } from "jiti"
const jiti = createJiti(fileURLToPath(import.meta.url))
jiti.import("./src/env")

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["next-auth"],
}

export default config
