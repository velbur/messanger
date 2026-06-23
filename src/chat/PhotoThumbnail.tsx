import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";

type Props = {
  image: string;
};

/** Превью для YouTube: только фото из переписки, без UI чата */
export const PhotoThumbnail: React.FC<Props> = ({image}) => {
  const ref = image.trim();
  if (!ref) {
    return <AbsoluteFill style={{backgroundColor: "#000000"}} />;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={staticFile(ref)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
};

export const PHOTO_THUMBNAIL_MARKER = "thumb-photo-composition-v1";
