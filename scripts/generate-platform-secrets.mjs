import { randomBytes } from "node:crypto";

function generateSecret() {
  return randomBytes(48).toString("base64url");
}

console.log(`PLATFORM_ACCESS_SECRET=${generateSecret()}`);
console.log(`CRON_SECRET=${generateSecret()}`);
