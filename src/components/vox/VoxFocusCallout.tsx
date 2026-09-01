import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { VoxFocusCalloutProps } from "../../types/vox";

/**
 * 局部聚焦遮罩: 非聚焦区压暗/泛白, 聚焦区保持清晰。
 * 用 SVG mask 挖空 + 羽化边, 配合外层镜头微推(由调用方包一层缩放容器)。
 */
export const VoxFocusCallout: React.FC<VoxFocusCalloutProps> = ({
  focusRect,
  feather = 60,
  dimOpacity = 0.72,
  startFrame = 0,
  durationInFrames = 18,
}) => {
  const frame = useCurrentFrame();

  const p = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    }
  );

  if (p === 0) return null;

  const { x, y, width, height } = focusRect;
  const maskId = `vox-focus-${Math.round(x)}-${Math.round(y)}`;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <mask id={maskId}>
          {/* 白色 = 显示遮罩(压暗), 黑色 = 挖空(聚焦区透出) */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={x - feather / 2}
            y={y - feather / 2}
            width={width + feather}
            height={height + feather}
            rx={feather / 2}
            fill="black"
            style={{ filter: `blur(${feather * 0.7}px)` }}
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="#0a0a0a"
        opacity={dimOpacity * p}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
};
