import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { VoxFilterProvider } from "../components/vox/VoxFilterProvider";
import { VoxUnderline } from "../components/vox/VoxUnderline";
import { VoxWavyUnderline } from "../components/vox/VoxWavyUnderline";
import { VoxCircle } from "../components/vox/VoxCircle";
import { VoxHighlighter } from "../components/vox/VoxHighlighter";
import { VoxArrow } from "../components/vox/VoxArrow";
import { VoxCross } from "../components/vox/VoxCross";
import { VoxBox } from "../components/vox/VoxBox";
import { VoxFocusCallout } from "../components/vox/VoxFocusCallout";
import { VoxPaperOverlay } from "../components/vox/VoxPaperOverlay";
import { docFit } from "../components/vox/docFit";

const pointSchema = z.tuple([z.number(), z.number()]);

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const annotationSchema = z.object({
  /** 触发帧 */
  at: z.number(),
  action: z.enum([
    "circle",
    "underline",
    "wavy",
    "highlight",
    "arrow",
    "cross",
    "box",
  ]),
  /** 目标区域(底图原始像素坐标) */
  target: rectSchema,
  /** 箭头专用起点终点(可选, 缺省从左上偏移指向 target 目标中心) */
  from: pointSchema.optional(),
  to: pointSchema.optional(),
  color: z.string().optional(),
  /** 动画时长(帧), 缺省按动作类型给 */
  durationInFrames: z.number().optional(),
});

const cameraKeySchema = z.object({
  /** 帧 */
  at: z.number(),
  /** 聚焦点(底图原始像素坐标) */
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

const focusSchema = z.object({
  /** 聚焦开始帧 */
  at: z.number(),
  /** 聚焦结束帧(之后遮罩淡出), 缺省保持到最后 */
  until: z.number().optional(),
  target: rectSchema,
  dimOpacity: z.number().default(0.68),
});

export const voxAnnotateSchema = z.object({
  /** 底图 public 路径 */
  image: z.string(),
  /** 底图原始像素宽/高 */
  imageWidth: z.number(),
  imageHeight: z.number(),
  annotations: z.array(annotationSchema),
  cameraKeys: z.array(cameraKeySchema),
  focus: focusSchema.optional(),
  /** 噪点强度 0~1 */
  grainOpacity: z.number().default(0.28),
  /** 标注 JSON 文件(public 路径, 如 scripts/hockey.json), 填了则覆盖上面所有数据字段 */
  scriptFile: z.string().optional(),
  /** 相机模式: keys=手动关键帧表; auto=跟随批注自动运镜(镜头先行) */
  cameraMode: z.enum(["keys", "auto"]).default("keys"),
  /** 明暗主题模式: light(白底纸张/报纸), dark(黑底暗黑推特/代码), auto */
  theme: z.enum(["light", "dark", "auto"]).optional(),
  /** 背景质感: grid(科技网格), noise(胶片杂色), paper(复古纸张), blueprint(工程蓝图), vignette(暗角微光), pure(纯黑), custom */
  bgType: z.enum(["grid", "noise", "paper", "blueprint", "vignette", "pure", "custom"]).optional(),
  /** 自定义背景图/视频 URL */
  bgCustomUrl: z.string().optional(),
});

export type VoxAnnotateProps = z.infer<typeof voxAnnotateSchema>;
type Annotation = z.infer<typeof annotationSchema>;
type CameraKey = z.infer<typeof cameraKeySchema>;

/** 动态自适应时长元数据计算: 无论用户标注多少项，视频总时长自动扩充适配 */
export const calculateVoxMetadata: CalculateMetadataFunction<VoxAnnotateProps> = async ({
  props,
  defaultProps,
}) => {
  const currentProps = { ...defaultProps, ...props };
  let scriptData: Partial<VoxAnnotateProps> = {};

  if (currentProps.scriptFile) {
    try {
      const res = await fetch(staticFile(currentProps.scriptFile));
      if (res.ok) {
        scriptData = await res.json();
      }
    } catch {
      // 忽略无法拉取的情况，使用缺省 props
    }
  }

  const merged = { ...currentProps, ...scriptData };
  const anns = merged.annotations ?? [];
  const focus = merged.focus;

  const maxAnnFrame = anns.reduce(
    (max, a) => Math.max(max, a.at + (a.durationInFrames ?? 30)),
    0
  );
  const maxFocusFrame = focus ? (focus.until ?? focus.at + 70) : 0;
  const maxAt = Math.max(maxAnnFrame, maxFocusFrame);

  // 基础 300 帧（10秒），若标注超出则自动扩展为 maxAt + 60 帧（留出 2 秒全景淡出收尾）
  const durationInFrames = Math.max(300, maxAt + 60);

  return {
    durationInFrames,
    props: merged,
  };
};

interface EventPoint {
  at: number;
  cx: number;
  cy: number;
  targetW: number;
  targetH: number;
  isFocus?: boolean;
}

/** 电影级平滑自动运镜算法: 仿 Vox 纪录片慢速微推与平滑机位过渡 */
const autoCameraKeys = (
  anns: Array<Annotation>,
  focus: VoxAnnotateProps["focus"],
  imgW: number,
  imgH: number,
  totalFrames: number
): CameraKey[] => {
  const events: EventPoint[] = [];

  anns.forEach((a) => {
    events.push({
      at: a.at,
      cx: a.target.x + a.target.width / 2,
      cy: a.target.y + a.target.height / 2,
      targetW: a.target.width,
      targetH: a.target.height,
    });
  });

  if (focus) {
    events.push({
      at: focus.at,
      cx: focus.target.x + focus.target.width / 2,
      cy: focus.target.y + focus.target.height / 2,
      targetW: focus.target.width,
      targetH: focus.target.height,
      isFocus: true,
    });
  }

  events.sort((a, b) => a.at - b.at);

  if (events.length === 0) {
    return [
      { at: 0, x: imgW / 2, y: imgH * 0.35, zoom: 0.88 },
      { at: totalFrames, x: imgW / 2, y: imgH * 0.45, zoom: 0.82 },
    ];
  }

  const keys: CameraKey[] = [
    { at: 0, x: imgW / 2, y: imgH * 0.35, zoom: 0.88 },
  ];

  let currentFrame = 0;

  events.forEach((ev, i) => {
    const scale = 1920 / imgW;
    // 聚焦(Focus)时大幅推近(1.8~2.2x), 普通批注克制推近(1.35~1.7x)
    const idealZoom = ev.isFocus
      ? Math.min(2.25, Math.max(1.8, (1920 * 0.72) / Math.max(180, ev.targetW * scale)))
      : Math.min(1.7, Math.max(1.35, (1920 * 0.55) / Math.max(200, ev.targetW * scale)));

    const prevX = keys[keys.length - 1]?.x ?? (imgW / 2);
    const prevY = keys[keys.length - 1]?.y ?? (imgH * 0.35);
    const dist = Math.hypot(ev.cx - prevX, ev.cy - prevY);
    // 根据空间位移距离自适应分配 24~36 帧滑行时间
    const travelFrames = Math.max(24, Math.min(36, Math.round(dist / 24)));

    // 镜头就位时间
    const targetArrive = Math.max(currentFrame + travelFrames, ev.at - 6);
    keys.push({
      at: Math.max(1, targetArrive),
      x: ev.cx,
      y: ev.cy,
      zoom: idealZoom,
    });

    // 停留与慢速微推(Ken Burns 漂移: 聚焦时推 5%, 普通推 3%)
    const nextEv = events[i + 1];
    const nextStart = nextEv ? nextEv.at : totalFrames - 40;
    const holdDuration = Math.max(20, Math.min(50, nextStart - targetArrive - 24));
    const holdEnd = targetArrive + holdDuration;
    const driftScale = ev.isFocus ? 1.05 : 1.03;

    keys.push({
      at: holdEnd,
      x: ev.cx,
      y: ev.cy + (ev.isFocus ? 14 : 10),
      zoom: idealZoom * driftScale,
    });

    currentFrame = holdEnd;
  });

  // 片尾平滑拉回全景
  const endPullStart = Math.min(totalFrames - 35, Math.max(currentFrame + 8, totalFrames - 45));
  if (endPullStart > currentFrame) {
    keys.push({
      at: endPullStart,
      x: keys[keys.length - 1].x,
      y: keys[keys.length - 1].y,
      zoom: keys[keys.length - 1].zoom,
    });
  }

  keys.push({
    at: totalFrames,
    x: imgW / 2,
    y: imgH * 0.45,
    zoom: 0.82,
  });

  // 去重并按帧单调递增过滤
  const cleanKeys: CameraKey[] = [];
  keys.sort((a, b) => a.at - b.at).forEach((k) => {
    const last = cleanKeys[cleanKeys.length - 1];
    if (!last) {
      cleanKeys.push(k);
    } else if (k.at > last.at + 3) {
      cleanKeys.push(k);
    } else {
      cleanKeys[cleanKeys.length - 1] = k;
    }
  });

  return cleanKeys;
};

const ACTION_COLOR: Record<Annotation["action"], string> = {
  circle: "#1d4ed8",
  underline: "#dc2626",
  wavy: "#e11d48",
  highlight: "#fde047",
  arrow: "#2563eb",
  cross: "#ef4444",
  box: "#0284c7",
};

const ACTION_DURATION: Record<Annotation["action"], number> = {
  circle: 30,
  underline: 16,
  wavy: 18,
  highlight: 14,
  arrow: 22,
  cross: 20,
  box: 26,
};

export const VoxAnnotateScene: React.FC<VoxAnnotateProps> = (props) => {
  const {
    image,
    imageWidth,
    imageHeight,
    annotations,
    cameraKeys,
    focus,
    grainOpacity,
    scriptFile,
    cameraMode,
  } = props;
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // scriptFile 模式: 从 public JSON 加载标注数据
  const [script, setScript] = useState<Partial<VoxAnnotateProps> | null>(null);
  useEffect(() => {
    if (!scriptFile) return;
    let cancelled = false;
    fetch(staticFile(scriptFile))
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setScript(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [scriptFile]);

  const data = scriptFile && script ? { ...props, ...script } : props;
  const dImage = data.image ?? image;
  const dImageW = data.imageWidth ?? imageWidth;
  const dImageH = data.imageHeight ?? imageHeight;
  const dAnns = data.annotations ?? annotations;
  const dFocus = data.focus ?? focus;
  const dGrain = data.grainOpacity ?? grainOpacity;

  const doc = useMemo(
    () => docFit(dImageW, dImageH, 1920),
    [dImageW, dImageH]
  );

  // 相机: 手动关键帧 or 自动跟随批注
  const keys = useMemo(() => {
    if (cameraMode === "auto") {
      return autoCameraKeys(dAnns, dFocus, dImageW, dImageH, durationInFrames);
    }
    return [...(data.cameraKeys ?? cameraKeys)].sort((a, b) => a.at - b.at);
  }, [
    cameraMode,
    dAnns,
    dFocus,
    dImageW,
    dImageH,
    durationInFrames,
    data.cameraKeys,
    cameraKeys,
  ]);

  const cam = useMemo(() => {
    const frames = keys.map((k) => k.at);
    const easing = Easing.inOut(Easing.cubic);
    const fx = interpolate(frame, frames, keys.map((k) => k.x), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    });
    const fy = interpolate(frame, frames, keys.map((k) => k.y), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    });
    const zoom = interpolate(frame, frames, keys.map((k) => k.zoom), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    });
    return { zoom, tx: 960 - doc.px(fx) * zoom, ty: 540 - doc.py(fy) * zoom };
  }, [frame, keys, doc]);

  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 聚焦遮罩激活窗口
  const focusActive =
    dFocus && frame >= dFocus.at && frame < (dFocus.until ?? Infinity);
  const focusFade = dFocus
    ? interpolate(
        frame,
        [
          dFocus.at,
          dFocus.at + 18,
          (dFocus.until ?? 1e9) - 15,
          dFocus.until ?? 1e9,
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const focusScreen = dFocus
    ? {
        x: doc.px(dFocus.target.x) * cam.zoom + cam.tx,
        y: doc.py(dFocus.target.y) * cam.zoom + cam.ty,
        width: doc.px(dFocus.target.width) * cam.zoom,
        height: doc.py(dFocus.target.height) * cam.zoom,
      }
    : { x: 0, y: 0, width: 0, height: 0 };

  // scriptFile 未加载完: 黑场等待
  if (scriptFile && !script) {
    return <AbsoluteFill style={{ backgroundColor: "#111" }} />;
  }

  const bgType = data.bgType ?? (data.theme === "light" ? "paper" : "grid");

  return (
    <VoxFilterProvider boilFps={12}>
      <AbsoluteFill style={{ backgroundColor: "#08090d", overflow: "hidden" }}>
        {/* 背景质感层 */}
        {bgType === "grid" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.5) 0%, rgba(9, 10, 15, 0.95) 100%), linear-gradient(to right, rgba(51, 65, 85, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(51, 65, 85, 0.22) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 48px 48px, 48px 48px",
            }}
          />
        )}

        {bgType === "blueprint" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#081b33",
              backgroundImage:
                "linear-gradient(to right, rgba(56, 189, 248, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.16) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        )}

        {bgType === "noise" && (
          <div style={{ position: "absolute", inset: 0, background: "#0c0d12" }}>
            <Img
              src={staticFile("textures/grain.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.35,
                mixBlendMode: "screen",
              }}
            />
          </div>
        )}

        {bgType === "paper" && (
          <div style={{ position: "absolute", inset: 0, background: "#f2ece1" }}>
            <Img
              src={staticFile("textures/newspaper.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.75,
                mixBlendMode: "multiply",
              }}
            />
          </div>
        )}

        {bgType === "vignette" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 50%, #1e2536 0%, #06070a 100%)",
            }}
          />
        )}

        {bgType === "custom" && data.bgCustomUrl && (
          <div style={{ position: "absolute", inset: 0 }}>
            <Img
              src={
                data.bgCustomUrl.startsWith("http") ||
                data.bgCustomUrl.startsWith("data:")
                  ? data.bgCustomUrl
                  : staticFile(data.bgCustomUrl)
              }
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {/* 相机层: 底图 + 批注 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: doc.w,
            height: doc.h,
            opacity: enter,
            transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {(() => {
            const isRemoteOrData =
              dImage.startsWith("http://") ||
              dImage.startsWith("https://") ||
              dImage.startsWith("data:");
            const imageSrc = isRemoteOrData ? dImage : staticFile(dImage);
            return (
              <Img
                src={imageSrc}
                style={{ width: doc.w, height: doc.h, display: "block" }}
              />
            );
          })()}

          {dAnns.map((a, i) => {
            const t = {
              x: doc.px(a.target.x),
              y: doc.py(a.target.y),
              width: doc.px(a.target.width),
              height: doc.py(a.target.height),
            };
            const isDarkTheme = data.theme === "dark";
            const darkActionColor: Record<string, string> = {
              circle: "#60a5fa",
              highlight: "#fde047",
              underline: "#f87171",
              wavy: "#fb7185",
              arrow: "#38bdf8",
              cross: "#ef4444",
              box: "#38bdf8",
            };
            const color =
              a.color ??
              (isDarkTheme
                ? darkActionColor[a.action] ?? "#60a5fa"
                : ACTION_COLOR[a.action]);
            const dur = a.durationInFrames ?? ACTION_DURATION[a.action];
            // 笔触宽度随底图缩放补偿: 保证不同尺寸素材上手绘粗细一致
            const strokeBase = Math.max(5, 7 * (doc.scale / 2.2));

            if (a.action === "circle") {
              return (
                <VoxCircle
                  key={i}
                  rect={t}
                  color={color}
                  strokeWidth={strokeBase * 1.2}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  rotation={-1.5}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "underline") {
              return (
                <VoxUnderline
                  key={i}
                  from={[t.x, t.y + t.height]}
                  to={[t.x + t.width, t.y + t.height]}
                  color={color}
                  strokeWidth={strokeBase}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  wobbleIntensity={strokeBase * 0.45}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "wavy") {
              return (
                <VoxWavyUnderline
                  key={i}
                  from={[t.x, t.y + t.height]}
                  to={[t.x + t.width, t.y + t.height]}
                  color={color}
                  strokeWidth={strokeBase * 0.9}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  wavelength={strokeBase * 3.2}
                  amplitude={strokeBase * 0.75}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "highlight") {
              return (
                <VoxHighlighter
                  key={i}
                  rect={t}
                  color={color}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  rotation={0}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "arrow") {
              // 起点与终点: 若未指定，则从目标左上角往上偏移指向目标中心偏左
              const fromPoint: [number, number] = a.from
                ? [doc.px(a.from[0]), doc.py(a.from[1])]
                : [t.x - 70, t.y - 60];
              const toPoint: [number, number] = a.to
                ? [doc.px(a.to[0]), doc.py(a.to[1])]
                : [t.x + 10, t.y + t.height / 2];

              return (
                <VoxArrow
                  key={i}
                  from={fromPoint}
                  to={toPoint}
                  color={color}
                  strokeWidth={strokeBase}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  headSize={Math.max(28, strokeBase * 4.5)}
                  headAngle={36}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "cross") {
              return (
                <VoxCross
                  key={i}
                  rect={t}
                  color={color}
                  strokeWidth={strokeBase * 1.1}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  theme={data.theme}
                />
              );
            }

            if (a.action === "box") {
              return (
                <VoxBox
                  key={i}
                  rect={t}
                  color={color}
                  strokeWidth={strokeBase}
                  delayInFrames={a.at}
                  durationInFrames={dur}
                  cornerOvershoot={strokeBase * 1.8}
                  theme={data.theme}
                />
              );
            }

            return null;
          })}
        </div>

        {/* 聚焦遮罩(屏幕空间, 随相机换算) */}
        {focusActive && focusFade > 0 && (
          <VoxFocusCallout
            focusRect={focusScreen}
            startFrame={dFocus!.at}
            durationInFrames={18}
            dimOpacity={(dFocus!.dimOpacity ?? 0.68) * focusFade}
            feather={50}
          />
        )}

        <VoxPaperOverlay
          texture="textures/grain.jpg"
          opacity={dGrain}
          blendMode="overlay"
          vignette
        />
      </AbsoluteFill>
    </VoxFilterProvider>
  );
};
