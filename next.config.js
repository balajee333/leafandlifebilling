const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep tracing scoped to this app (parent lockfile exists on some machines).
  // Do not set turbopack.root — it can break CSS resolution.
  outputFileTracingRoot: path.join(__dirname)
};

module.exports = nextConfig;
