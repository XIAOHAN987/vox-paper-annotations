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
    const w = rect.width;
    const h = rect.height;
    const isWide = w / Math.max(1, h) > 1.4;

    const pseudo = (i: number) => {
      const s = Math.sin(i * 269.5 + 183.3) * 28001.8384;
      return (s - Math.floor(s)) * 2 - 1;
    };

    let path = "";
    let totalLength = 0;

    if (isWide) {
      // 针对宽幅文本(如整行文字圈选): 采用圆头胶囊椭圆(Stadium Oval), 左右两端保持完美圆弧, 绝不出现尖头橄榄形
      const r = h / 2 + strokeWidth * 1.6;
      const xLeft = rect.x - strokeWidth * 0.8;
      const xRight = rect.x + w + strokeWidth * 0.8;
      const straightW = Math.max(10, xRight - xLeft - 2 * r);
      const topY = cy - r;
      const botY = cy + r;

      const pts: [number, number][] = [];

      // 1. 上横线 (从左到右)
      const nTop = 8;
      for (let i = 0; i <= nTop; i++) {
        const t = i / nTop;
        const px = xLeft + r + straightW * t;
        const py = topY + pseudo(i) * strokeWidth * 0.35;
        pts.push([px, py]);
      }

      // 2. 右半圆弧 (顺时针: -90° 到 +90°)
      const nArc = 8;
      for (let i = 1; i <= nArc; i++) {
        const a = -Math.PI / 2 + (i / nArc) * Math.PI;
        const px = xRight - r + Math.cos(a) * (r + pseudo(i + 10) * strokeWidth * 0.3);
        const py = cy + Math.sin(a) * (r + pseudo(i + 10) * strokeWidth * 0.3);
        pts.push([px, py]);
      }

      // 3. 下横线 (从右到左)
      for (let i = 1; i <= nTop; i++) {
        const t = i / nTop;
        const px = xRight - r - straightW * t;
        const py = botY + pseudo(i + 20) * strokeWidth * 0.35;
        pts.push([px, py]);
      }

      // 4. 左半圆弧 (顺时针: +90° 到 +270°/回到顶部)
      for (let i = 1; i <= nArc; i++) {
        const a = Math.PI / 2 + (i / nArc) * Math.PI;
        const px = xLeft + r + Math.cos(a) * (r + pseudo(i + 30) * strokeWidth * 0.3);
        const py = cy + Math.sin(a) * (r + pseudo(i + 30) * strokeWidth * 0.3);
        pts.push([px, py]);
      }

      // 5. 收笔自然搭接出头 (向右多画 20px, 模拟手工画圈首尾闭合相交)
      for (let i = 1; i <= 3; i++) {
        const t = i / 3;
        const px = xLeft + r + (straightW * 0.25) * t;
        const py = topY - 1.5 + pseudo(i + 45) * strokeWidth * 0.3;
        pts.push([px, py]);
      }

      path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const mx = (prev[0] + curr[0]) / 2 + pseudo(i + 5) * strokeWidth * 0.2;
        const my = (prev[1] + curr[1]) / 2 + pseudo(i + 7) * strokeWidth * 0.2;
        path += ` Q ${mx.toFixed(1)} ${my.toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`;
      }

      // 精确累加所有线段长度，确保 100% 完整闭合
      for (let i = 1; i < pts.length; i++) {
        totalLength += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      totalLength *= 1.06;
    } else {
      // 标准手绘椭圆
      const rx = w / 2 + strokeWidth * 1.8;
      const ry = h / 2 + strokeWidth * 1.6;
      const STEPS = 20;
      let startAngle = -Math.PI / 2;
      const pts: [number, number][] = [];
      for (let i = 0; i <= STEPS; i++) {
        const a = startAngle + (i / (STEPS - 3)) * Math.PI * 2;
        const wVal = pseudo(i) * strokeWidth * 0.4;
        const px = cx + Math.cos(a) * (rx + wVal);
        const py = cy + Math.sin(a) * (ry + wVal);
        pts.push([px, py]);
      }
      path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        path += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
        totalLength += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      totalLength *= 1.06;
    }

    return { d: path, length: totalLength };
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
