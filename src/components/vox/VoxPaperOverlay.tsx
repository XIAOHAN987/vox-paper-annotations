import { Img, staticFile, useCurrentFrame } from "remotion";
import type { VoxPaperOverlayProps } from "../../types/vox";

/**
 * 纸张质感 & 胶片噪点层:
 *  - 平铺纹理图, overlay/soft-light 混合
 *  - 12fps 随机微位移, 模拟胶片颗粒抖动
 *  - 可选四角暗角
 */
export const VoxPaperOverlay: React.FC<VoxPaperOverlayProps> = ({
  texture = "textures/grain.jpg",
  opacity = 0.35,
  blendMode = "overlay",
  vignette = true,
}) => {
  const frame = useCurrentFrame();

  // 12fps 抽帧的颗粒位移 (30fps 下每 2~3 帧跳一次)
  const step = Math.floor(frame / 2.5);
  const pseudo = (i: number) => {
    const s = Math.sin(step * 12.9898 + i * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const jitterX = (pseudo(1) - 0.5) * 14;
  const jitterY = (pseudo(2) - 0.5) * 14;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -20,
          mixBlendMode: blendMode,
          opacity,
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
          }}
        />
      </div>
      {vignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)",
          }}
        />
      )}
    </div>
  );
};
