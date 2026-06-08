import React from "react";

type Props = {
  side: "left" | "right";
  color: string;
};

/** Хвостик пузыря как в WhatsApp */
export const BubbleTail: React.FC<Props> = ({side, color}) => {
  const isLeft = side === "left";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={16}
      viewBox="0 0 12 16"
      aria-hidden
      style={{
        position: "absolute",
        bottom: 0,
        [isLeft ? "left" : "right"]: -6,
        transform: isLeft ? "none" : "scaleX(-1)",
      }}
    >
      <path
        d="M0 16V0C0 8 4 12 12 16H0Z"
        fill={color}
      />
    </svg>
  );
};
