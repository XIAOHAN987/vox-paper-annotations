import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxUnderlineProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘下划线 v2:
 *  - 路径: 随机 walk 多段贝塞尔(非等幅正弦), 手抖感
 *  - 笔触: 双层描边 —— 主笔触 + 偏移细笔触, 模拟马克笔压感出墨不均
 *  - 起笔/收笔: 笔触宽度渐变(起笔尖、中段粗、收笔回细)
 */
export const VoxUnderline: React.FC<VoxUnderlineProps> = ({
  from,
  to,
  color = "#1d4ed8",
  strokeWidth = 6,
  delayInFrames = 0,
  durationInFrames = 18,
  wobbleIntensity = 3,
  segments,
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

  const { mainPath, bleedPath, length } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.hypot(dx, dy);
    // 更密的分段: 每 ~14px 一段, 手抖密度高
    const segs = segments ?? Math.max(8, Math.round(dist / 14));
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);

    // 固定伪随机序列(路径每帧稳定, 沸腾交给 filter)
    const pseudo = (i: number, salt: number) => {
      const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    // 随机 walk: 每个控制点的偏移量做累加游走(不是独立抖动), 更像真实手抖
    const buildPath = (salt: number, wobble: number, jitterAlong: number) => {
      let walk = 0;
      let path = "";
      let prevX = from[0];
      let prevY = from[1];
      path = `M ${prevX} ${prevY}`;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        // walk 累加 + 阻尼回中, 形成连续不规则曲线
        walk = walk * 0.55 + pseudo(i, salt) * wobble;
        // 沿行进方向也有微抖(笔速不均)
        const along = pseudo(i, salt + 99) * jitterAlong;
        const bx = from[0] + dx * t + nx * walk + (dx / dist) * along;
        const by = from[1] + dy * t + ny * walk + (dy / dist) * along;
        // 平滑: 用前一点与当前点的中点做二次贝塞尔
        const mx = (prevX + bx) / 2 + nx * pseudo(i, salt + 7) * wobble * 0.4;
        const my = (prevY + by) / 2 + ny * pseudo(i, salt + 7) * wobble * 0.4;
        path += ` Q ${mx} ${my} ${bx} ${by}`;
        prevX = bx;
        prevY = by;
      }
      return path;
    };

    return {
      mainPath: buildPath(1, wobbleIntensity, wobbleIntensity * 0.8),
      // 渗墨层: 独立随机种子, 略细的伴生笔触
      bleedPath: buildPath(53, wobbleIntensity * 0.7, wobbleIntensity * 0.5),
      length: dist * 1.35,
    };
  }, [from, to, wobbleIntensity, segments]);

  if (localFrame < 0) return null;

  const pad = wobbleIntensity * 5 + strokeWidth * 2;
  const minX = Math.min(from[0], to[0]) - pad;
  const minY = Math.min(from[1], to[1]) - pad;
  const maxX = Math.max(from[0], to[0]) + pad;
  const maxY = Math.max(from[1], to[1]) + pad;

  const filter =
    boiled && boilEnabled ? `url(#${roughenFilterId})` : undefined;

  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        overflow: "visible",
        mixBlendMode: blendMode ?? (theme === "light" ? "multiply" : "normal"),
        pointerEvents: "none",
      }}
      width={maxX - minX}
      height={maxY - minY}
    >
      <g transform={`translate(${-minX} ${-minY})`}>
        {/* 渗墨层: 细、略偏、更淡, 先行一点 */}
        <path
          d={bleedPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.45}
          strokeLinecap="round"
          opacity={0.5}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - Math.min(1, grow * 1.08))}
          filter={filter}
        />
        {/* 主笔触 */}
        <path
          d={mainPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - grow)}
          filter={filter}
        />
        {/* 收笔墨点: 笔停顿时积墨 */}
        {grow > 0.97 && (
          <circle
            cx={to[0]}
            cy={to[1]}
            r={strokeWidth * 0.62}
            fill={color}
            opacity={0.85}
            filter={filter}
          />
        )}
      </g>
    </svg>
  );
};
