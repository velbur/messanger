#!/usr/bin/env node
import {syncMusicLibrary} from "./music-library.mjs";

const force = process.argv.includes("--force");
const rebuild = process.argv.includes("--rebuild");

try {
  const {logs} = await syncMusicLibrary({force, rebuildManifest: rebuild});
  for (const line of logs) {
    console.log(line);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
