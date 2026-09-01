/**
 * 文档适配工具: 任意尺寸的底图(报纸/PDF/网页截图) → 画布坐标换算。
 *
 * const doc = docFit(848, 1080, 1920);        // 原图宽高, 画布宽
 * <Img style={{ width: doc.w, height: doc.h }} />
 * target={{ x: doc.px(30), y: doc.py(100), width: doc.px(780), height: doc.py(62) }}
 */
export const docFit = (
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number
) => {
  const scale = canvasWidth / imageWidth;
  return {
    scale,
    w: imageWidth * scale,
    h: imageHeight * scale,
    px: (v: number) => v * scale,
    py: (v: number) => v * scale,
  };
};
