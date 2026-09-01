import "./index.css";
import { Composition } from "remotion";
import { VoxDemoScene } from "./compositions/VoxDemoScene";
import {
  calculateVoxMetadata,
  VoxAnnotateScene,
  voxAnnotateSchema,
} from "./compositions/VoxAnnotateScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 手写编排版: 报纸 Demo */}
      <Composition
        id="VoxDemo"
        component={VoxDemoScene}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 通用数据驱动版: 换素材/批注/镜头只改 props, 坐标全部用底图原始像素 */}
      <Composition
        id="VoxAnnotate"
        component={VoxAnnotateScene}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={voxAnnotateSchema}
        defaultProps={{
          image: "textures/newspaper.jpg",
          imageWidth: 848,
          imageHeight: 1080,
          grainOpacity: 0.28,
          cameraMode: "keys" as const,
          annotations: [
            {
              at: 38,
              action: "circle" as const,
              target: { x: 91, y: 115, width: 702, height: 36 },
            },
            {
              at: 68,
              action: "highlight" as const,
              target: { x: 20, y: 168, width: 620, height: 26 },
            },
            {
              at: 118,
              action: "underline" as const,
              target: { x: 618, y: 300, width: 190, height: 32 },
            },
          ],
          cameraKeys: [
            { at: 0, x: 424, y: 330, zoom: 1 },
            { at: 25, x: 424, y: 150, zoom: 1.3 },
            { at: 62, x: 424, y: 150, zoom: 1.35 },
            { at: 90, x: 350, y: 195, zoom: 1.5 },
            { at: 112, x: 712, y: 250, zoom: 1.7 },
            { at: 150, x: 712, y: 250, zoom: 1.7 },
            { at: 185, x: 424, y: 145, zoom: 1.4 },
            { at: 230, x: 424, y: 145, zoom: 1.45 },
            { at: 300, x: 424, y: 380, zoom: 0.92 },
          ],
          focus: {
            at: 175,
            until: 260,
            target: { x: 15, y: 95, width: 820, height: 105 },
            dimOpacity: 0.68,
          },
        }}
      />

      {/* 全功能批注展示版 (Showcase): 演示 7 种手绘批注 (圆圈/高亮/直线/波浪线/箭头/打叉/方框/聚焦) */}
      <Composition
        id="VoxShowcase"
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
            // 1. 蓝色圆圈
            {
              at: 25,
              action: "circle" as const,
              target: { x: 460, y: 65, width: 510, height: 85 },
            },
            // 2. 荧光笔高亮
            {
              at: 80,
              action: "highlight" as const,
              target: { x: 462, y: 598, width: 460, height: 70 },
            },
            // 3. 红色下划线
            {
              at: 135,
              action: "underline" as const,
              target: { x: 90, y: 795, width: 560, height: 95 },
            },
            // 4. 粉红波浪下划线
            {
              at: 190,
              action: "wavy" as const,
              target: { x: 460, y: 680, width: 420, height: 35 },
            },
            // 5. 蓝色指向箭头
            {
              at: 245,
              action: "arrow" as const,
              target: { x: 975, y: 220, width: 300, height: 120 },
              from: [860, 160],
              to: [970, 240],
            },
            // 6. 红色交叉打叉
            {
              at: 300,
              action: "cross" as const,
              target: { x: 1060, y: 620, width: 220, height: 180 },
            },
            // 7. 天蓝色手绘方框
            {
              at: 355,
              action: "box" as const,
              target: { x: 90, y: 1120, width: 620, height: 260 },
            },
          ],
          cameraKeys: [],
          focus: {
            at: 75,
            until: 130,
            target: { x: 450, y: 520, width: 620, height: 150 },
            dimOpacity: 0.65,
          },
        }}
      />

      {/* 冰球版面: 1652x1671 */}
      <Composition
        id="VoxHockey"
        component={VoxAnnotateScene}
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
          cameraMode: "keys" as const,
          annotations: [
            {
              at: 30,
              action: "circle" as const,
              target: { x: 460, y: 65, width: 510, height: 85 },
            },
            {
              at: 78,
              action: "highlight" as const,
              target: { x: 462, y: 598, width: 460, height: 70 },
            },
            {
              at: 128,
              action: "underline" as const,
              target: { x: 90, y: 795, width: 560, height: 95 },
            },
          ],
          cameraKeys: [
            { at: 0, x: 826, y: 420, zoom: 0.85 },
            { at: 28, x: 715, y: 108, zoom: 1.6 },
            { at: 66, x: 715, y: 108, zoom: 1.65 },
            { at: 95, x: 692, y: 633, zoom: 1.6 },
            { at: 118, x: 692, y: 633, zoom: 1.65 },
            { at: 148, x: 370, y: 840, zoom: 1.5 },
            { at: 178, x: 370, y: 840, zoom: 1.55 },
            { at: 210, x: 770, y: 545, zoom: 1.25 },
            { at: 255, x: 770, y: 545, zoom: 1.3 },
            { at: 300, x: 826, y: 500, zoom: 0.8 },
          ],
          focus: {
            at: 205,
            until: 265,
            target: { x: 450, y: 520, width: 620, height: 150 },
            dimOpacity: 0.68,
          },
        }}
      />

      {/* 脚本驱动版: 标注工具(marker.html)导出 JSON → public/scripts/, 这里读取, 自动运镜与动态时长 */}
      <Composition
        id="VoxScript"
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
    </>
  );
};
