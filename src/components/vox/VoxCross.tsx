import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxCrossProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘交叉打叉 (X Mark / Strikeout):
 *  - 两笔交错下笔 (第一笔完成后第二笔自然切入)
 *  - 带有真实书写的出头过冲与末端微积墨
 *  - 12fps 沸腾微颤与边缘粗糙化滤镜
 */
export const VoxCross: React.FC<VoxCrossProps> = ({
  rect,
  color = "#dc2626",
  strokeWidth = 7,
  delayInFrames = 0,
  durationInFrames = 20,
  overshootRatio = 0.15,
  wobbleIntensity = 2.5,
  boiled = true,
  blendMode,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { roughenFilterId, enabled: boilEnabled } = useVoxBoiled();

  const localFrame = frame - delayInFrames;
  const halfDur = Math.max(8, Math.round(durationInFrames * 0.6));
  const stagger = Math.max(4, Math.round(durationInFrames * 0.38));

  // 第一笔: 左上 → 右下
  const grow1 = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.9 },
    durationInFrames: halfDur,
  });

  // 第二笔: 右上 → 左下 (错开进入)
  const grow2 = spring({
    frame: Math.max(0, localFrame - stagger),
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.9 },
    durationInFrames: halfDur,
  });

  const { path1, path2, len1, len2, bounds, p1End, p2End } = useMemo(() => {
    const { x, y, width, height } = rect;
    const padX = width * overshootRatio;
    const padY = height * overshootRatio;

    // 伪随机
    const pseudo = (i: number, salt: number) => {
      const s = Math.sin(i * 133.7 + salt * 299.1) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    // 第一笔起终点 (左上到右下，加微量随机偏移)
    const p1_start: [number, number] = [x - padX + pseudo(1, 7) * 4, y - padY + pseudo(2, 7) * 4];
    const p1_end: [number, number] = [
      x + width + padX + pseudo(3, 7) * 4,
      y + height + padY + pseudo(4, 7) * 4,
    ];

    // 第二笔起终点 (右上到左下)
    const p2_start: [number, number] = [
      x + width + padX + pseudo(5, 13) * 4,
      y - padY + pseudo(6, 13) * 4,
    ];
    const p2_end: [number, number] = [x - padX + pseudo(7, 13) * 4, y + height + padY + pseudo(8, 13) * 4];

    // 绘制带手抖贝塞尔
    const buildLine = (start: [number, number], end: [number, number], salt: number) => {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const segs = 6;

      let p = `M ${start[0]} ${start[1]}`;
      let prevX = start[0];
      let prevY = start[1];

      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const wobble = pseudo(i, salt) * wobbleIntensity;
        const bx = start[0] + dx * t + nx * wobble;
        const by = start[1] + dy * t + ny * wobble;
        const mx = (prevX + bx) / 2 + nx * pseudo(i, salt + 5) * wobbleIntensity * 0.5;
        const my = (prevY + by) / 2 + ny * pseudo(i, salt + 5) * wobbleIntensity * 0.5;
        p += ` Q ${mx} ${my} ${bx} ${by}`;
        prevX = bx;
        prevY = by;
      }
      return { path: p, length: dist * 1.15 };
    };

    const l1 = buildLine(p1_start, p1_end, 19);
    const l2 = buildLine(p2_start, p2_end, 83);

    const pad = strokeWidth * 4 + 20;
    const minX = Math.min(p1_start[0], p1_end[0], p2_start[0], p2_end[0]) - pad;
    const minY = Math.min(p1_start[1], p1_end[1], p2_start[1], p2_end[1]) - pad;
    const maxX = Math.max(p1_start[0], p1_end[0], p2_start[0], p2_end[0]) + pad;
    const maxY = Math.max(p1_start[1], p1_end[1], p2_start[1], p2_end[1]) + pad;

    return {
      path1: l1.path,
      path2: l2.path,
      len1: l1.length,
      len2: l2.length,
      bounds: { minX, minY, width: maxX - minX, height: maxY - minY },
      p1End: p1_end,
      p2End: p2_end,
    };
  }, [rect, overshootRatio, wobbleIntensity, strokeWidth]);

  if (localFrame < 0) return null;

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
      <g transform={`translate(${-bounds.minX} ${-bounds.minY})`}>
        {/* 第一笔 */}
        <path
          d={path1}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={len1}
          strokeDashoffset={len1 * (1 - grow1)}
          filter={filter}
        />
        {grow1 > 0.95 && (
          <circle
            cx={p1End[0]}
            cy={p1End[1]}
            r={strokeWidth * 0.55}
            fill={color}
            opacity={0.8}
            filter={filter}
          />
        )}

        {/* 第二笔 */}
        {localFrame >= stagger && (
          <>
            <path
              d={path2}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={len2}
              strokeDashoffset={len2 * (1 - grow2)}
              filter={filter}
            />
            {grow2 > 0.95 && (
              <circle
                cx={p2End[0]}
                cy={p2End[1]}
                r={strokeWidth * 0.55}
                fill={color}
                opacity={0.8}
                filter={filter}
              />
            )}
          </>
        )}
      </g>
    </svg>
  );
};
