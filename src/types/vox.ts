export interface VoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseVoxProps {
  /** 笔触/高亮颜色 */
  color?: string;
  /** 笔触宽度(px) */
  strokeWidth?: number;
  /** 延迟帧数(从组件挂载起算) */
  delayInFrames?: number;
  /** 生长动画时长(帧) */
  durationInFrames?: number;
  /** 是否启用 12fps 沸腾抖动(默认 true) */
  boiled?: boolean;
  /** 混合模式, 默认 normal (可适配黑底与白底) */
  blendMode?: "normal" | "multiply" | "screen";
  /** 明暗主题: light(白底纸张), dark(黑底暗黑模式), auto */
  theme?: "light" | "dark" | "auto";
}

export interface VoxUnderlineProps extends BaseVoxProps {
  /** 起点与终点(组件内部坐标, 会自动生成带抖动的手绘路径) */
  from: [number, number];
  to: [number, number];
  /** 手绘波浪幅度(px), 默认 3 */
  wobbleIntensity?: number;
  /** 波浪分段数, 默认按长度自动 */
  segments?: number;
}

export interface VoxWavyUnderlineProps extends BaseVoxProps {
  /** 起点与终点(组件内部坐标) */
  from: [number, number];
  to: [number, number];
  /** 波浪波长(px), 默认 18 */
  wavelength?: number;
  /** 波浪振幅(px), 默认 4.5 */
  amplitude?: number;
}

export interface VoxCircleProps extends BaseVoxProps {
  /** 圈选区域(组件内部坐标) */
  rect: VoxRect;
  /** 椭圆旋转角(deg), 手绘感, 默认 -2 */
  rotation?: number;
  /** 画几圈, 默认 1 */
  loops?: number;
}

export interface VoxBoxProps extends BaseVoxProps {
  /** 方框区域(组件内部坐标) */
  rect: VoxRect;
  /** 四角出头量(px), 模拟手工画框四角相交过冲, 默认 10 */
  cornerOvershoot?: number;
  /** 手绘抖动幅度(px), 默认 2.5 */
  wobbleIntensity?: number;
  /** 整体微旋转(deg), 默认 -0.5 */
  rotation?: number;
}

export interface VoxHighlighterProps extends BaseVoxProps {
  rect: VoxRect;
  /** 涂抹倾角(deg), 范围建议 -3~3, 默认 -1 */
  rotation?: number;
}

export interface VoxArrowProps extends BaseVoxProps {
  /** 起点 [x, y] */
  from: [number, number];
  /** 终点 [x, y] (箭头尖端指向此位置) */
  to: [number, number];
  /** 弯曲曲率(px, 正负代表向上/向下弯), 默认 25 */
  curvature?: number;
  /** 箭头头部翼展尺寸(px), 默认 18 */
  headSize?: number;
  /** 箭头两翼夹角(deg), 默认 32 */
  headAngle?: number;
  /** 手绘抖动幅度(px), 默认 2 */
  wobbleIntensity?: number;
}

export interface VoxCrossProps extends BaseVoxProps {
  /** 交叉打叉区域(组件内部坐标) */
  rect: VoxRect;
  /** 四角出头比例(0.1=稍微画出框外), 默认 0.12 */
  overshootRatio?: number;
  /** 手绘抖动幅度(px), 默认 2.5 */
  wobbleIntensity?: number;
}

export interface VoxFocusCalloutProps {
  /** 聚焦区域(画布坐标, px) */
  focusRect: VoxRect;
  /** 边缘羽化(px), 默认 60 */
  feather?: number;
  /** 非聚焦区压暗程度 0~1, 默认 0.72 */
  dimOpacity?: number;
  /** 聚焦动画开始帧 */
  startFrame?: number;
  /** 聚焦动画时长(帧), 默认 18 */
  durationInFrames?: number;
  /** 背景模糊(px), 默认 0(不模糊) */
  backgroundBlur?: number;
}

export interface VoxTextWipeProps extends BaseVoxProps {
  /** 擦除方向, 默认 ltr */
  direction?: "ltr" | "rtl";
  /** 羽化带宽度(%), 默认 15 */
  feather?: number;
}

export interface VoxPaperOverlayProps {
  /** 噪点/纸张纹理图(public 路径) */
  texture?: string;
  /** 纹理不透明度, 默认 0.35 */
  opacity?: number;
  /** 混合模式, 默认 overlay */
  blendMode?: "overlay" | "multiply" | "screen" | "soft-light";
  /** 是否添加四角暗角, 默认 true */
  vignette?: boolean;
}
