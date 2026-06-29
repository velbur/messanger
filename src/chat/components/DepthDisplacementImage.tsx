import React, {useId} from "react";
import {AbsoluteFill, staticFile} from "remotion";
import {storyLayerPaths} from "../story-depth-paths";
import {motionVectors, sceneMotionLoopProgress} from "../story-motion";

type Props = {
  image: string;
  localFrame: number;
  directionSeed?: string;
  loopFrames?: number;
};

/**
 * Parallax через SVG displacement по .depth.png — один кадр, без трёх RGBA-слоёв (нет полос).
 */
export const DepthDisplacementImage: React.FC<Props> = ({
  image,
  localFrame,
  directionSeed = image,
  loopFrames,
}) => {
  const trimmed = image.trim();
  const paths = storyLayerPaths(trimmed);
  const progress = sceneMotionLoopProgress(localFrame, loopFrames);
  const {panX, panY} = motionVectors(directionSeed);
  const filterId = useId().replace(/:/g, "");

  const dispX = progress * panX * 22;
  const dispY = progress * panY * 10;
  const dispScale = Math.hypot(dispX, dispY);
  const baseScale = 1.02 + progress * 0.025;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#080808"}}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${baseScale})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          style={{display: "block"}}
        >
          <defs>
            <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
              <feImage
                href={staticFile(paths.depth)}
                result="depthMap"
                preserveAspectRatio="xMidYMid slice"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="depthMap"
                scale={dispScale}
                xChannelSelector="R"
                yChannelSelector="R"
              />
            </filter>
          </defs>
          <image
            href={staticFile(trimmed)}
            x="0"
            y="0"
            width="1000"
            height="1000"
            preserveAspectRatio="xMidYMid slice"
            filter={`url(#${filterId})`}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
