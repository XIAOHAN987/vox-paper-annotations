import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  CalculateMetadataFunction,
} from "remotion";
import { z } from "zod";
import { VoxTechCallout } from "../components/vox/VoxTechCallout";
import { VoxPaperOverlay } from "../components/vox/VoxPaperOverlay";
import { docFit } from "../components/vox/docFit";

const metricSchema = z.object({
  label: z.string(),
  value: z.string(),
  highlight: z.boolean().optional(),
});

const techCalloutSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  at: z.number(),
  durationInFrames: z.number().optional(),
  target: z.tuple([z.number(), z.number()]),
  cardPos: z.tuple([z.number(), z.number()]),
  tag: z.string().optional(),
  title: z.string(),
  metrics: z.array(metricSchema).optional(),
  colorTheme: z.enum(["cyan", "amber", "emerald", "rose"]).optional(),
});

export const voxTechSceneSchema = z.object({
  image: z.string().default("screenshots/tech-chip.svg"),
  imageWidth: z.number().default(1920),
  imageHeight: z.number().default(1080),
  callouts: z.array(techCalloutSchema),
  scriptFile: z.string().optional(),
  bgType: z.enum(["grid", "blueprint", "noise", "vignette", "pure"]).default("grid"),
  theme: z.enum(["dark", "light"]).default("dark"),
});

export type VoxTechSceneProps = z.infer<typeof voxTechSceneSchema>;

export const calculateTechMetadata: CalculateMetadataFunction<VoxTechSceneProps> = async ({
  props,
  defaultProps,
}) => {
  const current = { ...defaultProps, ...props };
  let scriptData: Partial<VoxTechSceneProps> = {};

  if (current.scriptFile) {
    try {
      const res = await fetch(staticFile(current.scriptFile));
      if (res.ok) scriptData = await res.json();
    } catch {
      // 忽略无法拉取的情况
    }
  }

  const callouts = scriptData.callouts ?? current.callouts ?? [];
  const maxAt = callouts.length ? Math.max(...callouts.map((c) => c.at)) : 0;
  const durationInFrames = Math.max(90, maxAt + 40);

  return { durationInFrames };
};

export const VoxTechCalloutScene: React.FC<VoxTechSceneProps> = (props) => {
  const frame = useCurrentFrame();
  const { width: compW, height: compH } = useVideoConfig();

  const [script, setScript] = React.useState<VoxTechSceneProps | null>(null);

  React.useEffect(() => {
    if (!props.scriptFile) return;
    fetch(staticFile(props.scriptFile))
      .then((r) => r.json())
      .then((data) => setScript(data))
      .catch(() => {});
  }, [props.scriptFile]);

  const data = script ?? props;
  const dImage = data.image || "screenshots/tech-chip.svg";
  const dImgW = data.imageWidth || 1920;
  const dImgH = data.imageHeight || 1080;
  const dCallouts = useMemo(() => data.callouts || [], [data.callouts]);

  const doc = useMemo(
    () => docFit(dImgW, dImgH, compW),
    [dImgW, dImgH, compW]
  );

  // 相机轨迹自动跟随活动卡片
  const cam = useMemo(() => {
    let targetX = doc.w / 2;
    let targetY = doc.h / 2;
    let targetZoom = 1.0;

    const sorted = [...dCallouts].sort((a, b) => a.at - b.at);
    let curActive = sorted[0];

    for (const c of sorted) {
      if (frame >= c.at - 20) curActive = c;
    }

    if (curActive) {
      // 聚焦在瞄准点与卡片之间的中点
      const midX = (curActive.target[0] + curActive.cardPos[0] + 130) / 2;
      const midY = (curActive.target[1] + curActive.cardPos[1] + 40) / 2;
      const pxX = doc.px(midX);
      const pxY = doc.py(midY);

      const p = Math.min(1, Math.max(0, (frame - (curActive.at - 20)) / 22));
      const smoothP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      targetX = (doc.w / 2) * (1 - smoothP) + pxX * smoothP;
      targetY = (doc.h / 2) * (1 - smoothP) + pxY * smoothP;
      targetZoom = 0.95 * (1 - smoothP) + 1.28 * smoothP;
    }

    // Ken Burns 呼吸微推
    const drift = interpolate(frame, [0, 300], [1.0, 1.03], { extrapolateRight: "clamp" });
    const finalZoom = targetZoom * drift;

    const tx = compW / 2 - targetX * finalZoom;
    const ty = compH / 2 - targetY * finalZoom;

    return { tx, ty, zoom: finalZoom };
  }, [doc, dCallouts, frame, compW, compH]);

  const isRemoteOrData =
    dImage.startsWith("http://") ||
    dImage.startsWith("https://") ||
    dImage.startsWith("data:");
  const imageSrc = isRemoteOrData ? dImage : staticFile(dImage);

  return (
    <AbsoluteFill style={{ backgroundColor: "#07090d", overflow: "hidden" }}>
      {/* 科技背景质感 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 45%, rgba(20, 26, 41, 0.7) 0%, rgba(7, 9, 13, 0.98) 100%), linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      {/* 相机缩放平移层 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: doc.w,
          height: doc.h,
          transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* 底图 */}
        <Img
          src={imageSrc}
          style={{ width: doc.w, height: doc.h, display: "block" }}
        />

        {/* CAD 引线拆解卡片 */}
        {dCallouts.map((c, i) => (
          <VoxTechCallout
            key={c.id ?? i}
            at={c.at}
            durationInFrames={c.durationInFrames ?? 28}
            target={[doc.px(c.target[0]), doc.py(c.target[1])]}
            cardPos={[doc.px(c.cardPos[0]), doc.py(c.cardPos[1])]}
            tag={c.tag}
            title={c.title}
            metrics={c.metrics}
            colorTheme={c.colorTheme ?? "cyan"}
          />
        ))}
      </div>

      {/* 胶片暗角微颗粒 */}
      <VoxPaperOverlay
        texture="textures/grain.jpg"
        opacity={0.15}
        blendMode="screen"
        vignette
      />
    </AbsoluteFill>
  );
};
