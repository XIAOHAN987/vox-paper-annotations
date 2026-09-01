import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { useVoxBoiled } from "./VoxFilterProvider";

export interface VoxPaperOverlayProps {
  texture?: string;
  opacity?: number;
  blendMode?: "overlay" | "multiply" | "screen" | "soft-light";
  vignette?: boolean;
  enabled?: boolean;
  theme?: "light" | "dark" | "auto";
}

/**
 * 纸张质感 & 电影级胶片噪点层:
 *  - 针对白底纸张/报纸：智能采用 multiply 正片叠底 + SVG 动态微纤维颗粒，白纸也能清晰看见真实纸张呼吸感
 *  - 针对深色/暗黑底图：智能采用 screen/overlay 呈现深邃胶片微光
 *  - 12fps 随机定格位移与动态湍流噪点
 */
export const VoxPaperOverlay: React.FC<VoxPaperOverlayProps> = ({
  texture = "textures/grain.jpg",
  opacity = 0.35,
  blendMode,
  vignette = true,
  enabled = true,
  theme = "light",
}) => {
  const frame = useCurrentFrame();
  const { boiledSeed } = useVoxBoiled();

  if (!enabled || opacity <= 0) return null;

  // 12fps 抽帧的颗粒位移 (模拟真实 12fps 胶片/定格动画)
  const step = Math.floor(frame / 2.5);
  const pseudo = (i: number) => {
    const s = Math.sin(step * 12.9898 + i * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const jitterX = (pseudo(1) - 0.5) * 12;
  const jitterY = (pseudo(2) - 0.5) * 12;

  // 根据明暗主题自动选择最佳混合模式
  const isLight = theme === "light";
  const effectiveBlendMode = blendMode ?? (isLight ? "multiply" : "screen");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {/* 1. 真实纹理图混合层 */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          mixBlendMode: effectiveBlendMode,
          opacity: isLight ? Math.min(1, opacity * 0.9) : opacity * 0.75,
          transform: `translate(${jitterX}px, ${jitterY}px)`,
        }}
      >
        <Img
          src={staticFile(texture)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: isLight ? "contrast(140%) brightness(105%)" : "none",
          }}
        />
      </div>

      {/* 2. 动态 SVG 显微纸张纤维颗粒 (100% 解决白纸看不到噪点的问题) */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: isLight ? "multiply" : "overlay",
          opacity: opacity * 0.65,
        }}
      >
        <filter id={`paper-grain-${boiledSeed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="3"
            seed={boiledSeed * 7 + 1}
            result="noise"
          />
          <feColorMatrix
            type="matrix"
            values={
              isLight
                ? "0 0 0 0 0.15  0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0.45 0"
                : "0 0 0 0 0.9  0 0 0 0 0.9  0 0 0 0 0.9  0 0 0 0.4 0"
            }
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#paper-grain-${boiledSeed})`}
        />
      </svg>

      {/* 3. 电影级暗角 */}
      {vignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isLight
              ? "radial-gradient(ellipse at center, transparent 60%, rgba(60,40,20,0.18) 100%)"
              : "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.42) 100%)",
            mixBlendMode: isLight ? "multiply" : "normal",
          }}
        />
      )}
    </div>
  );
};
