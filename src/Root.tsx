import "./index.css";
import { Composition } from "remotion";
import { VoxDemoScene } from "./compositions/VoxDemoScene";
import {
  calculateVoxMetadata,
  VoxAnnotateScene,
  voxAnnotateSchema,
} from "./compositions/VoxAnnotateScene";
import {
  calculateTechMetadata,
  VoxTechCalloutScene,
  voxTechSceneSchema,
} from "./compositions/VoxTechCalloutScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1. VOX 纸张手绘标注大片: 由工作台直接驱动，自动运镜与动态时长 */}
      <Composition
        id="VOX_纸张手绘标注"
        component={VoxAnnotateScene}
        calculateMetadata={calculateVoxMetadata}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={voxAnnotateSchema}
        defaultProps={{
          image: "screenshots/hockey-page.png",
          imageWidth: 1652,
          imageHeight: 1671,
          grainOpacity: 0.25,
          annotations: [],
          cameraKeys: [],
          scriptFile: "scripts/vox-script.json",
          cameraMode: "auto" as const,
        }}
      />

      {/* 2. CAD 暗调科技引线拆解大片: 由工作台直接驱动，自动对焦与发光折线参数卡片 */}
      <Composition
        id="CAD_科技引线拆解"
        component={VoxTechCalloutScene}
        calculateMetadata={calculateTechMetadata}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={voxTechSceneSchema}
        defaultProps={{
          image: "screenshots/tech-chip.svg",
          imageWidth: 1920,
          imageHeight: 1080,
          scriptFile: "scripts/tech-chip.json",
          bgType: "grid" as const,
          theme: "dark" as const,
          callouts: [],
        }}
      />

      {/* 3. 官方全动效演示分镜 (Showcase) */}
      <Composition
        id="VOX_全动效展示Demo"
        component={VoxAnnotateScene}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
        schema={voxAnnotateSchema}
        defaultProps={{
          image: "screenshots/hockey-page.png",
          imageWidth: 1652,
          imageHeight: 1671,
          grainOpacity: 0.26,
          cameraMode: "auto" as const,
          annotations: [
            { at: 25, action: "circle" as const, target: { x: 460, y: 65, width: 510, height: 85 } },
            { at: 80, action: "highlight" as const, target: { x: 462, y: 598, width: 460, height: 70 } },
            { at: 135, action: "underline" as const, target: { x: 90, y: 795, width: 560, height: 95 } },
            { at: 190, action: "wavy" as const, target: { x: 460, y: 680, width: 420, height: 35 } },
            { at: 245, action: "arrow" as const, target: { x: 975, y: 220, width: 300, height: 120 }, from: [860, 160], to: [970, 240] },
            { at: 300, action: "cross" as const, target: { x: 1060, y: 620, width: 220, height: 180 } },
            { at: 355, action: "box" as const, target: { x: 90, y: 1120, width: 620, height: 260 } },
          ],
          cameraKeys: [],
          focus: { at: 75, until: 130, target: { x: 450, y: 520, width: 620, height: 150 }, dimOpacity: 0.65 },
        }}
      />
    </>
  );
};
