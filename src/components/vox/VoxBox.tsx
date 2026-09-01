import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxBoxProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘边框方框 (Hand-drawn Rectangular Box):
 *  - 四角自然出头交叉 (Corner Overshoots)
 *  - 连续带手抖笔触闭合
 *  - 12fps 沸腾微颤与边缘粗糙化滤镜
 */
export const VoxBox: React.FC<VoxBoxProps> = ({
  rect,
  color = "#1d4ed8",
  strokeWidth = 6,
  delayInFrames = 0,
  durationInFrames = 26,
  cornerOvershoot = 12,
  wobbleIntensity = 2.5,
  rotation = -0.5,
  boiled = true,
  blendMode,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { roughenFilterId, enabled: boilEnabled } = useVoxBoiled();

  const localFrame = frame - delayInFrames;

  const grow = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 24, stiffness: 95, mass: 1 },
    durationInFrames,
  });

  const { path, length, bounds } = useMemo(() => {
    const { x, y, width, height } = rect;

    // 伪随机
    const pseudo = (i: number, salt: number) => {
      const s = Math.sin(i * 137.9 + salt * 283.3) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    // 4个角坐标加出头
    const os = cornerOvershoot;
    const tl: [number, number] = [x, y];
    const tr: [number, number] = [x + width, y];
    const br: [number, number] = [x + width, y + height];
    const bl: [number, number] = [x, y + height];

    // 辅助生成带手抖线段
    const appendEdge = (
      p0: [number, number],
      p1: [number, number],
      startExt: number,
      endExt: number,
      salt: number
    ) => {
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const nx = -uy;
      const ny = ux;

      const sx = p0[0] - ux * startExt;
      const sy = p0[1] - uy * startExt;
      const ex = p1[0] + ux * endExt;
      const ey = p1[1] + uy * endExt;

      const segs = 4;
      let res = "";
      let prevX = sx;
      let prevY = sy;

      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const wobble = pseudo(i, salt) * wobbleIntensity;
        const bx = sx + (ex - sx) * t + nx * wobble;
        const by = sy + (ey - sy) * t + ny * wobble;
        const mx = (prevX + bx) / 2 + nx * pseudo(i, salt + 3) * wobbleIntensity * 0.4;
        const my = (prevY + by) / 2 + ny * pseudo(i, salt + 3) * wobbleIntensity * 0.4;
        res += ` Q ${mx} ${my} ${bx} ${by}`;
        prevX = bx;
        prevY = by;
      }
      return { start: [sx, sy], seg: res };
    };

    // 顺时针 4 条边，各自带有过冲
    const topEdge = appendEdge(tl, tr, os * 0.8, os, 11);
    const rightEdge = appendEdge(tr, br, os * 0.8, os, 23);
    const bottomEdge = appendEdge(br, bl, os * 0.8, os, 47);
    const leftEdge = appendEdge(bl, tl, os * 0.8, os * 1.2, 71);

    // 连接为一个连续路径
    const fullPath = `M ${topEdge.start[0]} ${topEdge.start[1]} ${topEdge.seg} ` +
      `M ${rightEdge.start[0]} ${rightEdge.start[1]} ${rightEdge.seg} ` +
      `M ${bottomEdge.start[0]} ${bottomEdge.start[1]} ${bottomEdge.seg} ` +
      `M ${leftEdge.start[0]} ${leftEdge.start[1]} ${leftEdge.seg}`;

    const perimeter = (width + height) * 2 + os * 8;

    const pad = os * 2 + strokeWidth * 4 + 20;
    const minX = x - pad;
    const minY = y - pad;
    const maxX = x + width + pad;
    const maxY = y + height + pad;

    return {
      path: fullPath,
      length: perimeter * 1.15,
      bounds: { minX, minY, width: maxX - minX, height: maxY - minY },
    };
  }, [rect, cornerOvershoot, wobbleIntensity, strokeWidth]);

  if (localFrame < 0) return null;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const filter =
    boiled && boilEnabled ? `url(#${roughenFilterId})` : undefined;

  return (
    <svg
      style={{
        position: "absolute",
        left: bounds.minX,
        top: bounds.minY,
        overflow: "visible",
        mixBlendMode: blendMode ?? (theme === "light" ? "multiply" : "normal"),
        pointerEvents: "none",
      }}
      width={bounds.width}
      height={bounds.height}
    >
      <g
        transform={`translate(${-bounds.minX} ${-bounds.minY}) rotate(${rotation} ${cx} ${cy})`}
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - grow)}
          filter={filter}
        />
      </g>
    </svg>
  );
};
