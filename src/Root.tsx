import "./index.css";
import { Composition } from "remotion";
import {
  calculateVoxMetadata,
  VoxAnnotateScene,
  voxAnnotateSchema,
} from "./compositions/VoxAnnotateScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 唯一生产分镜: VOX 纸张手绘标注大片 (由打标工作台直接驱动，自动运镜与紧凑动态收尾) */}
      <Composition
        id="VOX-纸张手绘标注"
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
