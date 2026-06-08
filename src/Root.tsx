import React from "react";
import {Composition} from "remotion";
import {ChatVideo} from "./chat/ChatVideo";
import {parseConversation, type ConversationInput} from "./chat/schema";
import {buildTimeline} from "./chat/timeline";
import sample from "../public/conversation.json";

type Props = {
  conversation: ConversationInput;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChatVideo"
        component={ChatVideo as React.ComponentType<Props>}
        width={1080}
        height={1920}
        fps={60}
        defaultProps={{
          conversation: parseConversation(sample),
        }}
        calculateMetadata={({props}) => {
          const conversation = parseConversation(props.conversation);
          const timeline = buildTimeline(conversation);
          return {
            durationInFrames: timeline.durationInFrames,
            props: {
              ...props,
              conversation,
            },
          };
        }}
      />
    </>
  );
};
