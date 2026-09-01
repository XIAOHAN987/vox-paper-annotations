export interface TechCalloutItem {
  id?: number | string;
  /** 触发帧 */
  at: number;
  /** 动画持续时长(帧) */
  durationInFrames?: number;
  /** 瞄准目标坐标 [x, y] (底图原始像素) */
  target: [number, number];
  /** HUD 卡片左上角坐标 [x, y] (底图原始像素) */
  cardPos: [number, number];
  /** 卡片标签/分类, 如 [NPU CORE 01] */
  tag?: string;
  /** 主标题 */
  title: string;
  /** 详细参数键值列表 */
  metrics?: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  /** 主题色调: cyan(赛博青), amber(工业橙), emerald(极客绿), rose(高能红) */
  colorTheme?: "cyan" | "amber" | "emerald" | "rose";
}

export interface VoxTechCalloutSceneProps {
  image: string;
  imageWidth: number;
  imageHeight: number;
  durationInFrames?: number;
  callouts: TechCalloutItem[];
  bgType?: "grid" | "blueprint" | "noise" | "vignette" | "pure";
  theme?: "dark" | "light";
}
