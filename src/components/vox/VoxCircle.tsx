import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxCircleProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘椭圆圈注: 沿不规则椭圆路径画一圈(或多圈),
 * 起笔处略出头, 收尾自然搭接 —— 模拟马克笔圈重点。
 */
export const VoxCircle: React.FC<VoxCircleProps> = ({
  rect,
  color = "#1d4ed8",
  strokeWidth = 7,
  delayInFrames = 0,
  durationInFrames = 26,
  rotation = -2,
  loops = 1,
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
    config: { damping: 26, stiffness: 90, mass: 1 },
    durationInFrames,
  });

  const { d, length } = useMemo(() => {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    // 手绘椭圆略大于目标, 留白呼吸
    const rx = rect.width / 2 + strokeWidth * 1.6;
    const ry = rect.height / 2 + strokeWidth * 1.4;

    const pseudo = (i: number) => {
      const s = Math.sin(i * 269.5 + 183.3) * 28001.8384;
      return (s - Math.floor(s)) * 2 - 1;
    };

    // 用 16 段贝塞尔逼近带抖动的椭圆, 多圈时逐圈半径微缩
    const STEPS = 16;
    let path = "";
    for (let loop = 0; loop < loops; loop++) {
      const shrink = 1 - loop * 0.06;
      const startAngle = -Math.PI / 2 + loop * 0.5;
      for (let i = 0; i < STEPS; i++) {
        const a0 = startAngle + (i / STEPS) * Math.PI * 2;
        const a1 = startAngle + ((i + 1) / STEPS) * Math.PI * 2;
        const w0 = pseudo(i + loop * 31) * strokeWidth * 0.55;
        const w1 = pseudo(i + 1 + loop * 31) * strokeWidth * 0.55;
        const x0 = cx + Math.cos(a0) * (rx * shrink + w0);
        const y0 = cy + Math.sin(a0) * (ry * shrink + w0);
        const x1 = cx + Math.cos(a1) * (rx * shrink + w1);
        const y1 = cy + Math.sin(a1) * (ry * shrink + w1);
        const mx = (x0 + x1) / 2 + pseudo(i + 7) * strokeWidth * 0.4;
        const my = (y0 + y1) / 2 + pseudo(i + 13) * strokeWidth * 0.4;
        path += i === 0 ? `M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}` : ` Q ${mx} ${my} ${x1} ${y1}`;
      }
    }
    // 估算周长
    const perimeter =
      loops * Math.PI * 2 * Math.sqrt((rx * rx + ry * ry) / 2) * 1.15;
    return { d: path, length: perimeter };
  }, [rect, strokeWidth, loops]);

  if (localFrame < 0) return null;

  const pad = strokeWidth * 3;
  return (
    <svg
      style={{
        position: "absolute",
        left: rect.x - rect.width / 2 - pad,
        top: rect.y - rect.height / 2 - pad,
        overflow: "visible",
        mixBlendMode: blendMode ?? (theme === "light" ? "multiply" : "normal"),
        pointerEvents: "none",
      }}
      width={rect.width * 2 + pad * 2}
      height={rect.height * 2 + pad * 2}
    >
      <g
        transform={`translate(${-(rect.x - rect.width / 2 - pad)} ${-(rect.y - rect.height / 2 - pad)}) rotate(${rotation} ${rect.x + rect.width / 2} ${rect.y + rect.height / 2})`}
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - grow)}
          filter={boiled && boilEnabled ? `url(#${roughenFilterId})` : undefined}
        />
      </g>
    </svg>
  );
};
