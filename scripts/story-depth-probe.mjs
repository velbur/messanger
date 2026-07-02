#!/usr/bin/env node
import {probeStoryDepth} from "./story-depth.mjs";
import {isParallaxBakeAvailable} from "./parallax-bake.mjs";

const depth = await probeStoryDepth();
const parallaxBake = await isParallaxBakeAvailable();
console.log(
  JSON.stringify(
    {
      ...depth,
      parallaxBake,
      ready: parallaxBake,
    },
    null,
    2,
  ),
);
if (!parallaxBake) {
  console.error(
    "\nParallax bake недоступен. Mac: ./run.sh setup-native  или  .venv/bin/pip install -r scripts/python/requirements-parallax.txt",
  );
  process.exit(1);
}
