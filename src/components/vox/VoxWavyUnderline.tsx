import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxWavyUnderlineProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘波浪下划线 (Wavy / Squiggle Underline):
 *  - 经典审阅波浪线，模拟马克笔快速画出的连贯波浪
 *  - 动态起伏振幅与周期微抖，避免机械死板
 *  - 12fps 沸腾微颤与边缘粗糙化滤镜
 */
export const VoxWavyUnderline: React.FC<VoxWavyUnderlineProps> = ({
  from,
  to,
  color = "#dc2626",
  strokeWidth = 5,
  delayInFrames = 0,
  durationInFrames = 18,
  wavelength = 18,
  amplitude = 4.5,
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
    config: { damping: 20, stiffness: 110, mass: 0.9 },
    durationInFrames,
  });

  const { path, bleedPath, length, bounds } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    // 伪随机
    const pseudo = (i: number, salt: number) => {
      const s = Math.sin(i * 149.3 + salt * 313.7) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    const count = Math.max(4, Math.round(dist / (wavelength / 2)));

    const buildWave = (salt: number, ampRatio: number) => {
      let p = `M ${from[0]} ${from[1]}`;

      for (let i = 1; i <= count; i++) {
        const t = i / count;
        // 奇数向上拱，偶数向下拱
        const sign = i % 2 === 1 ? 1 : -1;
        const curAmp = (amplitude * ampRatio + pseudo(i, salt) * 1.2) * sign;

        // 当前顶点控制点
        const midT = (i - 0.5) / count;
        const cx = from[0] + dx * midT + nx * curAmp;
        const cy = from[1] + dy * midT + ny * curAmp;

        // 当前过零点
        const ex = from[0] + dx * t;
        const ey = from[1] + dy * t;

        p += ` Q ${cx} ${cy} ${ex} ${ey}`;
      }
      return p;
    };

    const mainWave = buildWave(17, 1);
    const bleedWave = buildWave(79, 0.75);

    const pad = amplitude * 3 + strokeWidth * 3 + 10;
    const minX = Math.min(from[0], to[0]) - pad;
    const minY = Math.min(from[1], to[1]) - pad;
    const maxX = Math.max(from[0], to[0]) + pad;
    const maxY = Math.max(from[1], to[1]) + pad;

    return {
      path: mainWave,
      bleedPath: bleedWave,
      length: dist * 1.45,
      bounds: { minX, minY, width: maxX - minX, height: maxY - minY },
    };
  }, [from, to, wavelength, amplitude, strokeWidth]);

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
        {/* 渗墨层 */}
        <path
          d={bleedPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.45}
          strokeLinecap="round"
          opacity={0.45}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - Math.min(1, grow * 1.06))}
          filter={filter}
        />
        {/* 主笔触 */}
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
