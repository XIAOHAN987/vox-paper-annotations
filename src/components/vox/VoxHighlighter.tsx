import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { VoxHighlighterProps } from "../../types/vox";
import { useVoxBoiled } from "./VoxFilterProvider";

/**
 * 荧光笔涂抹高亮:
 *  - 粗笔触横向扫过 (clipPath 生长)
 *  - 半透明荧光黄 multiply, 底层文字清晰透出
 *  - 两端斜切不规则多边形, 配合 heavy 湍流滤镜模拟马克笔纤维边缘
 */
export const VoxHighlighter: React.FC<VoxHighlighterProps> = ({
  rect,
  color = "#fde047",
  delayInFrames = 0,
  durationInFrames = 14,
  rotation = 0,
  boiled = true,
  blendMode,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { enabled: boilEnabled } = useVoxBoiled();

  const localFrame = frame - delayInFrames;

  // 线性偏缓的涂抹: 起笔稍慢, 中段快, 收笔略拖
  const progress = interpolate(localFrame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2.2),
  });

  const { width, height } = rect;

  // 真实斜头马克笔(Chisel-tip)平直涂抹几何:
  // 上下边缘保持平直(仅带微弱手绘微抖), 两端带有自然斜切角
  const polygon = useMemo(() => {
    const pseudo = (i: number) => {
      const s = Math.sin(i * 91.7 + 47.3) * 12543.876;
      return (s - Math.floor(s)) * 2 - 1;
    };
    const pts: string[] = [];
    const slant = Math.min(10, Math.max(4, height * 0.22));
    const N = 8;

    // 上边缘(左→右)
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = slant + (width - slant) * t;
      const py = Math.max(0, 1.0 + pseudo(i) * 1.2);
      pts.push(`${px},${py}`);
    }

    // 下边缘(右→左)
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const px = width * t;
      const py = height - 1.0 + pseudo(i + 40) * 1.2;
      pts.push(`${px},${py}`);
    }

    return pts.join(" ");
  }, [width, height]);

  if (localFrame < 0) return null;

  const clipId = `hl-clip-${Math.round(rect.x)}-${Math.round(rect.y)}`;
  const pad = 12;

  return (
    <svg
      style={{
        position: "absolute",
        left: rect.x - pad,
        top: rect.y - pad,
        overflow: "visible",
        mixBlendMode: blendMode ?? (theme === "dark" ? "screen" : "multiply"),
        pointerEvents: "none",
      }}
      width={width + pad * 2}
      height={height + pad * 2}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={0}
            y={-height * 0.3}
            width={(width + pad * 2) * progress}
            height={height * 1.6 + pad * 2}
          />
        </clipPath>
      </defs>
      <g
        transform={`translate(${pad} ${pad}) rotate(${rotation} ${width / 2} ${height / 2})`}
        clipPath={`url(#${clipId})`}
      >
        <polygon
          points={polygon}
          fill={color}
          opacity={0.85}
          filter={boiled && boilEnabled ? "url(#vox-roughen-heavy)" : undefined}
        />
      </g>
    </svg>
  );
};
