import {invalidateBundleCache} from "./bundle-cache.mjs";

await invalidateBundleCache();
console.log("Remotion bundle-кэш очищен (.cache/remotion-bundle)");
