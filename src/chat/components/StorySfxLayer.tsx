import React from "react";
import {Audio, Sequence, staticFile} from "remotion";
import type {ResolvedStorySfxCue} from "../sfx";

type StorySfxLayerProps = {
  cues: ResolvedStorySfxCue[];
  startFrame: number;
  endFrame: number;
  masterVolume: number;
  keyPrefix: string;
};

export const StorySfxLayer: React.FC<StorySfxLayerProps> = ({
  cues,
  startFrame,
  endFrame,
  masterVolume,
  keyPrefix,
}) => {
  if (!cues.length) {
    return null;
  }

  return (
    <>
      {cues.map((cue, index) => {
        const from = startFrame + cue.delayFrames;
        const durationInFrames = Math.max(1, endFrame - from);
        if (durationInFrames <= 0) {
          return null;
        }
        return (
          <Sequence
            key={`${keyPrefix}-${cue.id}-${index}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <Audio
              src={staticFile(cue.path)}
              volume={cue.volume * masterVolume}
              loop={cue.loop}
            />
          </Sequence>
        );
      })}
    </>
  );
};
