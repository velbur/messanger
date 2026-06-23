import {rm} from "node:fs/promises";
import path from "node:path";

const BUNDLE_OUT_DIR = path.join(path.resolve(import.meta.dirname, ".."), ".cache/remotion-bundle");

await rm(BUNDLE_OUT_DIR, {recursive: true, force: true});
console.log("Remotion bundle-кэш очищен (.cache/remotion-bundle)");
