import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VoxArrowProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 手绘指向箭头:
 *  - 弓形弯曲主轴 + 随机游走手抖轨迹
 *  - 箭头双翼在箭杆画至 70% 处开始展开生长
 *  - 12fps 沸腾微颤与边缘粗糙化滤镜
 */
export const VoxArrow: React.FC<VoxArrowProps> = ({
  from,
  to,
  color = "#1d4ed8",
  strokeWidth = 6,
  delayInFrames = 0,
  durationInFrames = 22,
  curvature = 24,
  headSize = 18,
  headAngle = 32,
  wobbleIntensity = 2.2,
  boiled = true,
  blendMode,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { roughenFilterId, enabled: boilEnabled } = useVoxBoiled();

  const localFrame = frame - delayInFrames;

  // 主箭杆生长
  const shaftGrow = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 22, stiffness: 100, mass: 0.9 },
    durationInFrames: Math.round(durationInFrames * 0.8),
  });

  // 箭头双翼生长 (延迟 35% 帧数进入)
  const headGrow = spring({
    frame: Math.max(0, localFrame - Math.round(durationInFrames * 0.35)),
    fps,
    config: { damping: 18, stiffness: 140, mass: 0.8 },
    durationInFrames: Math.round(durationInFrames * 0.65),
  });

  const { shaftPath, leftWingPath, rightWingPath, shaftLength, bounds } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.hypot(dx, dy) || 1;

    // 法向量 (用于弯曲和手抖)
    const nx = -dy / dist;
    const ny = dx / dist;

    // 伪随机生成器
    const pseudo = (i: number, salt: number) => {
      const s = Math.sin(i * 157.3 + salt * 271.9) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };

    // 箭杆：带弯曲曲率与手抖的二次贝塞尔曲线
    const segs = Math.max(6, Math.round(dist / 16));
    let path = `M ${from[0]} ${from[1]}`;
    let prevX = from[0];
    let prevY = from[1];

    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      // 弓形抛物线弯曲: 4 * t * (1 - t) 在 t=0.5 处达最大值 1
      const arch = 4 * t * (1 - t) * curvature;
      const wobble = pseudo(i, 11) * wobbleIntensity;
      const bx = from[0] + dx * t + nx * (arch + wobble);
      const by = from[1] + dy * t + ny * (arch + wobble);

      const mx = (prevX + bx) / 2 + nx * pseudo(i, 43) * wobbleIntensity * 0.5;
      const my = (prevY + by) / 2 + ny * pseudo(i, 43) * wobbleIntensity * 0.5;

      path += ` Q ${mx} ${my} ${bx} ${by}`;
      prevX = bx;
      prevY = by;
    }

    // 计算终点切线角度 (考虑曲率修正)
    // 箭尖切线微分: d(arch)/dt at t=1 为 -4 * curvature
    const endTangentX = dx + nx * (-4 * curvature);
    const endTangentY = dy + ny * (-4 * curvature);
    const endAngle = Math.atan2(endTangentY, endTangentX);

    const radAngle = (headAngle * Math.PI) / 180;
    const angleLeft = endAngle + Math.PI - radAngle;
    const angleRight = endAngle + Math.PI + radAngle;

    // 左右箭翼 (加微量手抖贝塞尔)
    const lx = to[0] + Math.cos(angleLeft) * headSize;
    const ly = to[1] + Math.sin(angleLeft) * headSize;
    const rx = to[0] + Math.cos(angleRight) * headSize;
    const ry = to[1] + Math.sin(angleRight) * headSize;

    const lmX = (to[0] + lx) / 2 + nx * pseudo(3, 9) * 2;
    const lmY = (to[1] + ly) / 2 + ny * pseudo(3, 9) * 2;
    const rmX = (to[0] + rx) / 2 - nx * pseudo(5, 7) * 2;
    const rmY = (to[1] + ry) / 2 - ny * pseudo(5, 7) * 2;

    const leftWing = `M ${to[0]} ${to[1]} Q ${lmX} ${lmY} ${lx} ${ly}`;
    const rightWing = `M ${to[0]} ${to[1]} Q ${rmX} ${rmY} ${rx} ${ry}`;

    const pad = Math.max(headSize, Math.abs(curvature)) + strokeWidth * 4 + 20;
    const minX = Math.min(from[0], to[0], lx, rx) - pad;
    const minY = Math.min(from[1], to[1], ly, ry) - pad;
    const maxX = Math.max(from[0], to[0], lx, rx) + pad;
    const maxY = Math.max(from[1], to[1], ly, ry) + pad;

    return {
      shaftPath: path,
      leftWingPath: leftWing,
      rightWingPath: rightWing,
      shaftLength: dist * 1.25,
      bounds: { minX, minY, width: maxX - minX, height: maxY - minY },
    };
  }, [from, to, curvature, headSize, headAngle, wobbleIntensity, strokeWidth]);

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
        {/* 箭杆主线 */}
        <path
          d={shaftPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={shaftLength}
          strokeDashoffset={shaftLength * (1 - shaftGrow)}
          filter={filter}
        />
        {/* 箭头左翼 */}
        <path
          d={leftWingPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.95}
          strokeLinecap="round"
          strokeDasharray={headSize * 1.5}
          strokeDashoffset={headSize * 1.5 * (1 - headGrow)}
          filter={filter}
        />
        {/* 箭头右翼 */}
        <path
          d={rightWingPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.95}
          strokeLinecap="round"
          strokeDasharray={headSize * 1.5}
          strokeDashoffset={headSize * 1.5 * (1 - headGrow)}
          filter={filter}
        />
      </g>
    </svg>
  );
};
