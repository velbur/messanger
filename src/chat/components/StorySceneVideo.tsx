import React from "react";
import {
  AbsoluteFill,
  Loop,
  OffthreadVideo,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {storyVideoForwardDurationFrames} from "../story-motion";
import {KenBurnsImage} from "./KenBurnsImage";

type Props = {
  video: string;
  image?: string;
  videoDurationMs?: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  loop: boolean;
};

const HoldMotionImage: React.FC<{image: string}> = ({image}) => {
  const localFrame = useCurrentFrame();
  return (
    <KenBurnsImage
      image={image}
      localFrame={localFrame}
      durationFrames={1}
      animation="kenburns"
      loop
    />
  );
};

export const StorySceneVideo: React.FC<Props> = ({
  video,
  image,
  videoDurationMs,
  sceneStartFrame,
  sceneDurationFrames,
  loop,
}) => {
  const {fps} = useVideoConfig();
  const videoDurationFrames = storyVideoForwardDurationFrames(videoDurationMs, fps);
  const playFrames = Math.min(videoDurationFrames, sceneDurationFrames);
  const holdFrames = Math.max(0, sceneDurationFrames - playFrames);
  const holdImage = image?.trim();

  if (loop) {
    return (
      <Sequence
        key={`loop-${video}-${sceneStartFrame}`}
        from={sceneStartFrame}
        durationInFrames={sceneDurationFrames}
        layout="none"
      >
        <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
          <Loop durationInFrames={videoDurationFrames}>
            <OffthreadVideo
              src={staticFile(video)}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Loop>
        </AbsoluteFill>
      </Sequence>
    );
  }

  return (
    <Sequence
      key={`hold-${video}-${sceneStartFrame}`}
      from={sceneStartFrame}
      durationInFrames={sceneDurationFrames}
      layout="none"
    >
      <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000000"}}>
        <Series>
          <Series.Sequence durationInFrames={playFrames}>
            <OffthreadVideo
              src={staticFile(video)}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Series.Sequence>
          {holdImage && holdFrames > 0 ? (
            <Series.Sequence durationInFrames={holdFrames}>
              <HoldMotionImage image={holdImage} />
            </Series.Sequence>
          ) : null}
        </Series>
      </AbsoluteFill>
    </Sequence>
  );
};
