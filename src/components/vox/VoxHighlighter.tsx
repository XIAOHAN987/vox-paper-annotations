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

  // 真实斜头马克笔 (Chisel-Tip Highlighter) 有机物理几何:
  // 1. 扁平斜头主笔触(保持文字行水平贴合, 带有 ±1.6px 手绘有机微颤与斜切端)
  // 2. 核心受力带(模拟笔芯中间下压出墨更浓郁的压感)
  // 3. 起笔与收笔墨水浸润微晕 (Ink Bleed / Pooling)
  const { mainPolygon, corePolygon, startBleed, endBleed } = useMemo(() => {
    const pseudo = (i: number) => {
      const s = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
      return (s - Math.floor(s)) * 2 - 1;
    };

    const slant = Math.min(12, Math.max(5, height * 0.24));
    const N = 12;
    const pts: string[] = [];
    const corePts: string[] = [];

    // 上边缘 (左至右)
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = slant * (1 - t * 0.4) + (width - slant * 0.6) * t;
      // 微妙手绘起伏: 两端稍微扩张 0.5px, 中间平顺
      const py = Math.max(0, 0.8 + pseudo(i) * 1.5);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }

    // 右边缘斜切过渡
    pts.push(`${(width + 2).toFixed(1)},${(height * 0.35).toFixed(1)}`);

    // 下边缘 (右至左)
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const px = (width + 1) * t - (1 - t) * 1.5;
      const py = height - 0.8 + pseudo(i + 50) * 1.5;
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }

    // 核心受力墨层 (高度 55%, 笔尖下压力度最大的区域)
    const coreTop = height * 0.22;
    const coreH = height * 0.56;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      corePts.push(`${(slant + (width - slant - 4) * t).toFixed(1)},${(coreTop + pseudo(i + 10) * 0.8).toFixed(1)}`);
    }
    for (let i = 6; i >= 0; i--) {
      const t = i / 6;
      corePts.push(`${(2 + (width - 4) * t).toFixed(1)},${(coreTop + coreH + pseudo(i + 30) * 0.8).toFixed(1)}`);
    }

    return {
      mainPolygon: pts.join(" "),
      corePolygon: corePts.join(" "),
      startBleed: { cx: slant * 0.6, cy: height * 0.5, rx: slant * 0.7, ry: height * 0.46 },
      endBleed: { cx: width - 1, cy: height * 0.5, rx: slant * 0.55, ry: height * 0.48 },
    };
  }, [width, height]);

  if (localFrame < 0) return null;

  const clipId = `hl-clip-${Math.round(rect.x)}-${Math.round(rect.y)}`;
  const pad = 14;

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
            y={-height * 0.4}
            width={(width + pad * 2) * progress}
            height={height * 1.8 + pad * 2}
          />
        </clipPath>
      </defs>
      <g
        transform={`translate(${pad} ${pad}) rotate(${rotation} ${width / 2} ${height / 2})`}
        clipPath={`url(#${clipId})`}
      >
        {/* 起笔墨水浸润底色 */}
        <ellipse
          cx={startBleed.cx}
          cy={startBleed.cy}
          rx={startBleed.rx}
          ry={startBleed.ry}
          fill={color}
          opacity={0.35}
          filter={boiled && boilEnabled ? "url(#vox-roughen)" : undefined}
        />

        {/* 主笔触涂抹色块 (带纸张毛边滤镜) */}
        <polygon
          points={mainPolygon}
          fill={color}
          opacity={theme === "dark" ? 0.78 : 0.62}
          filter={boiled && boilEnabled ? "url(#vox-roughen-heavy)" : undefined}
        />

        {/* 核心下压深墨层 (营造扁平笔尖内部压感与墨水层次) */}
        <polygon
          points={corePolygon}
          fill={color}
          opacity={theme === "dark" ? 0.35 : 0.28}
          filter={boiled && boilEnabled ? "url(#vox-roughen-heavy)" : undefined}
        />

        {/* 收笔墨水回流停顿浸润 */}
        <ellipse
          cx={endBleed.cx}
          cy={endBleed.cy}
          rx={endBleed.rx}
          ry={endBleed.ry}
          fill={color}
          opacity={0.3}
          filter={boiled && boilEnabled ? "url(#vox-roughen)" : undefined}
        />
      </g>
    </svg>
  );
};
