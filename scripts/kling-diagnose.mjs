import {createHmac} from "node:crypto";
import {loadKlingEnv, getKlingCredentials, formatKlingError} from "./kling-client.mjs";

await loadKlingEnv();
const creds = getKlingCredentials();
if (!creds) {
  console.log("No credentials");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({iss: creds.accessKey, exp: now + 1800, nbf: now - 5}),
).toString("base64url");
const data = `${header}.${payload}`;
const sig = createHmac("sha256", creds.secretKey).update(data).digest("base64url");
const token = `${data}.${sig}`;

const auth = {Authorization: `Bearer ${token}`};

const bases = ["https://api.klingai.com", "https://api-beijing.klingai.com"];
const end = Date.now();
const start = end - 90 * 24 * 3600 * 1000;
const costsQuery = new URLSearchParams({
  start_time: String(start),
  end_time: String(end),
});

const paths = [
  `/account/costs?${costsQuery}`,
  "/account/packages",
  "/account/package/list",
  "/v1/account/packages",
  "/account/info",
];

for (const base of bases) {
  for (const p of paths) {
    const r = await fetch(`${base}${p}`, {headers: auth});
    const text = await r.text();
    if (r.status !== 404) {
      console.log(`\n${base}${p} → ${r.status}`);
      console.log(text.slice(0, 600));
    }
  }
}

const r = await fetch("https://api.klingai.com/v1/images/generations", {
  method: "POST",
  headers: {...auth, "Content-Type": "application/json"},
  body: JSON.stringify({
    model_name: "kling-v1",
    prompt: "simple red circle on white background",
    n: 1,
    aspect_ratio: "1:1",
  }),
});
const body = await r.text();
console.log(`\nPOST /v1/images/generations → ${r.status}`);
console.log(body.slice(0, 800));

try {
  const parsed = JSON.parse(body);
  if (parsed.message) {
    console.log("\nFormatted:", formatKlingError(new Error(parsed.message)));
  }
} catch {
  /* ignore */
}
