import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { VoxFilterProvider } from "../components/vox/VoxFilterProvider";
import { VoxUnderline } from "../components/vox/VoxUnderline";
import { VoxCircle } from "../components/vox/VoxCircle";
import { VoxHighlighter } from "../components/vox/VoxHighlighter";
import { VoxFocusCallout } from "../components/vox/VoxFocusCallout";
import { VoxPaperOverlay } from "../components/vox/VoxPaperOverlay";

/**
 * VOX 风格手绘批注 Demo (10s @ 30fps = 300 帧)
 *
 * 镜头设计: 报纸撑满全宽(1920), 高 2445, 通过相机推拉摇移浏览版面。
 * 批注节奏与镜头同步 —— 镜头先到位, 笔触再落下:
 *
 *  0~25f    开场: 俯视版面顶部, 缓慢推近主标题
 *  25~70f   镜头压在主标题上, 蓝圈画出
 *  62~90f   镜头微下移至副标题, 荧光笔扫过
 *  92~140f  镜头横移+推近到右栏 "LA REVOLTE", 红下划线
 *  150~200f 镜头回到主标题, 聚焦遮罩压暗四周
 *  200~300f 缓慢拉远收尾, 展示整版
 */

// 报纸原图 848x1080 → 撑满 1920 宽, 高 2445
const PAPER_W = 848;
const PAPER_H = 1080;
const SCALE = 1920 / PAPER_W; // ≈ 2.264
const DOC_H = PAPER_H * SCALE;

// 原图坐标 → 文档(画布)坐标
const px = (x: number) => x * SCALE;
const py = (y: number) => y * SCALE;

/** 相机关键帧: [帧, 聚焦点(原图坐标), 缩放] */
const CAMERA_KEYS: Array<[number, number, number, number]> = [
  [0, 424, 330, 1.0], // 开场: 版面上半部全景
  [25, 424, 150, 1.3], // 推向主标题
  [62, 424, 150, 1.35], // 停住画圈
  [90, 350, 195, 1.5], // 微移到副标题
  [112, 712, 250, 1.7], // 横移到右栏
  [150, 712, 250, 1.7], // 停住画下划线
  [185, 424, 145, 1.4], // 回拉主标题(聚焦)
  [230, 424, 145, 1.45], // 聚焦保持, 极缓推近
  [300, 424, 380, 0.92], // 拉远收尾
];

/** 当前帧的相机状态: zoom + 位移(使聚焦点居中) */
const cameraAt = (frame: number) => {
  const frames = CAMERA_KEYS.map((k) => k[0]);
  const xs = CAMERA_KEYS.map((k) => k[1]);
  const ys = CAMERA_KEYS.map((k) => k[2]);
  const zs = CAMERA_KEYS.map((k) => k[3]);
  const easing = Easing.inOut(Easing.cubic);

  const fx = interpolate(frame, frames, xs, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const fy = interpolate(frame, frames, ys, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const zoom = interpolate(frame, frames, zs, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  // screen = doc * zoom + translate, 聚焦点对齐画面中心
  return {
    zoom,
    tx: 960 - px(fx) * zoom,
    ty: 540 - py(fy) * zoom,
  };
};

export const VoxDemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);

  // 开场淡入
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 聚焦遮罩锚定主标题区(原图坐标), 跟随相机换算到屏幕坐标
  const FOCUS = { x: 15, y: 95, w: 820, h: 105 };
  const focusScreen = {
    x: px(FOCUS.x) * cam.zoom + cam.tx,
    y: py(FOCUS.y) * cam.zoom + cam.ty,
    width: FOCUS.w * SCALE * cam.zoom,
    height: FOCUS.h * SCALE * cam.zoom,
  };

  return (
    <VoxFilterProvider boilFps={12}>
      <AbsoluteFill style={{ backgroundColor: "#111", overflow: "hidden" }}>
        {/* ===== 相机层: 报纸 + 批注都在相机内, 一起运动 ===== */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: DOC_H,
            opacity: enter,
            transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <Img
            src={staticFile("textures/newspaper.jpg")}
            style={{ width: 1920, height: DOC_H, display: "block" }}
          />

          {/* ① 蓝圈: 主标题 (原图 x:30~810, y:100~162) */}
          <VoxCircle
            rect={{ x: px(30), y: py(100), width: px(780), height: py(62) }}
            color="#1d4ed8"
            strokeWidth={9}
            delayInFrames={28}
            durationInFrames={34}
            rotation={-1.5}
          />

          {/* ② 荧光笔: 副标题第一行 (原图 x:20~640, y:168~194) */}
          <VoxHighlighter
            rect={{ x: px(20), y: py(168), width: px(620), height: py(26) }}
            delayInFrames={68}
            durationInFrames={16}
            rotation={-0.8}
          />

          {/* ③ 红下划线: 右栏标题底部 (原图 x:618~808, y:332) */}
          <VoxUnderline
            from={[px(618), py(332)]}
            to={[px(808), py(332)]}
            color="#dc2626"
            strokeWidth={8}
            delayInFrames={118}
            durationInFrames={18}
            wobbleIntensity={3}
          />
        </div>

        {/* ===== 聚焦遮罩: 屏幕空间, 锚定主标题跟随相机 ===== */}
        <VoxFocusCallout
          focusRect={focusScreen}
          startFrame={175}
          durationInFrames={20}
          dimOpacity={0.68}
          feather={50}
        />

        {/* ===== 纸张噪点: 全程覆盖 ===== */}
        <VoxPaperOverlay
          texture="textures/grain.jpg"
          opacity={0.28}
          blendMode="overlay"
          vignette
        />
      </AbsoluteFill>
    </VoxFilterProvider>
  );
};
