const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Without this, Puppeteer downloads Chrome to a system-level cache
  // directory (e.g. ~/.cache/puppeteer). On some hosts — Render included
  // — that path isn't reliably carried over from the build step into the
  // running service, causing "Could not find Chrome" at runtime even
  // though the install succeeded during build. Pinning the download
  // inside this project folder guarantees it's part of the same
  // filesystem that actually gets deployed.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
