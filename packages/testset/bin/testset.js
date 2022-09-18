#!/usr/bin/env node
const { spawn } = require("child_process");
const { join } = require("path");

spawn("node", [join(__dirname, "../dist/index.js"), ...process.argv.slice(2)], {
  stdio: "inherit",
});
