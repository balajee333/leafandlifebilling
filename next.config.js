const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname)
  },
  allowedDevOrigins: ['192.168.0.5']
};

module.exports = nextConfig;
