#!/usr/bin/env node
import {probeStoryDepth} from "./story-depth.mjs";

const status = await probeStoryDepth();
console.log(JSON.stringify(status, null, 2));
