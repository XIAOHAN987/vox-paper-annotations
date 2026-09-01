import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 全局 SVG 滤镜提供者:
 *  - vox-roughen: 手绘粗糙边缘 (feTurbulence + feDisplacementMap)
 *  - 12fps 抽帧 seed, 实现定格动画"沸腾"微颤
 *
 * 用法: 在 Composition 根部包一层 <VoxFilterProvider>, 内部组件通过
 * useVoxBoiled() 拿到 filter id 与当前 seed。
 */

interface VoxFilterContextValue {
  boiledSeed: number;
  roughenFilterId: string;
  enabled: boolean;
}

const VoxFilterContext = createContext<VoxFilterContextValue>({
  boiledSeed: 0,
  roughenFilterId: "vox-roughen",
  enabled: true,
});

export const useVoxBoiled = () => useContext(VoxFilterContext);

export const VoxFilterProvider: React.FC<{
  children: React.ReactNode;
  /** 沸腾帧率, 默认 12fps */
  boilFps?: number;
  /** 湍流强度, 默认 4.5 */
  displacementScale?: number;
  /** 关闭沸腾(静态模式) */
  enabled?: boolean;
}> = ({
  children,
  boilFps = 12,
  displacementScale = 4.5,
  enabled = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const boiledSeed = useMemo(() => {
    if (!enabled) return 0;
    return Math.floor(frame / Math.max(1, Math.round(fps / boilFps)));
  }, [frame, fps, boilFps, enabled]);

  const value = useMemo(
    () => ({
      boiledSeed,
      roughenFilterId: "vox-roughen",
      enabled,
    }),
    [boiledSeed, enabled]
  );

  return (
    <VoxFilterContext.Provider value={value}>
      {/* 滤镜定义: 挂在绝对定位的 0 尺寸 SVG 上, 不影响布局 */}
      <svg
        width={0}
        height={0}
        style={{ position: "absolute" }}
        aria-hidden
      >
        <defs>
          <filter
            id="vox-roughen"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            {/* 高频湍流(0.35): 相机放大后仍保持细腻毛边 */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.35"
              numOctaves="4"
              seed={boiledSeed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="disp"
            />
            {/* 低频湍流叠加: 整体形状慢速漂移, 避免高频抖动太"电流感" */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03"
              numOctaves="2"
              seed={boiledSeed + 13}
              result="warp"
            />
            <feDisplacementMap
              in="disp"
              in2="warp"
              scale={displacementScale * 2.4}
              xChannelSelector="R"
              yChannelSelector="G"
              result="warped"
            />
            {/* 轻微侵蚀: 笔触边缘出现缺口颗粒, 模拟马克笔出墨不均 */}
            <feMorphology
              in="warped"
              operator="erode"
              radius="0.6"
              result="eroded"
            />
            <feComposite in="warped" in2="eroded" operator="over" />
          </filter>
          {/* 高亮涂抹专用: 细腻微粗糙, 模拟真实马克笔纸张纤维 */}
          <filter
            id="vox-roughen-heavy"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.25"
              numOctaves="3"
              seed={boiledSeed + 7}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={3.2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {children}
    </VoxFilterContext.Provider>
  );
};
