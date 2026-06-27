import React from "react";
import {Audio, Sequence, staticFile, useCurrentFrame} from "remotion";
import {msToFrames} from "../fps";
import type {ResolvedStorySfxCue} from "../sfx";

type StorySfxLayerProps = {
  cues: ResolvedStorySfxCue[];
  startFrame: number;
  endFrame: number;
  masterVolume: number;
  keyPrefix: string;
};

const StorySfxAudio: React.FC<{
  cue: ResolvedStorySfxCue;
  sequenceFrom: number;
  volume: number;
}> = ({cue, sequenceFrom, volume}) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - sequenceFrom);

  if (cue.loop) {
    const loopFrames = Math.max(1, msToFrames(cue.durationMs));
    return (
      <Audio
        src={staticFile(cue.path)}
        volume={volume}
        startFrom={localFrame % loopFrames}
        pauseWhenBuffering={false}
      />
    );
  }

  return (
    <Audio
      src={staticFile(cue.path)}
      volume={volume}
      pauseWhenBuffering={false}
    />
  );
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
        const volume = Math.min(1, cue.volume * masterVolume);
        return (
          <Sequence
            key={`${keyPrefix}-${cue.id}-${index}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <StorySfxAudio cue={cue} sequenceFrom={from} volume={volume} />
          </Sequence>
        );
      })}
    </>
  );
};
