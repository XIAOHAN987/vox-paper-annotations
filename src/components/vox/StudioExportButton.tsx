import React, { useState } from "react";
import { VoxAnnotateProps } from "../../compositions/VoxAnnotateScene";

interface Props {
  props: VoxAnnotateProps;
  durationInFrames: number;
}

export const StudioExportButton: React.FC<Props> = ({ props, durationInFrames }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const startExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (exporting) return;

    try {
      setExporting(true);
      setProgress(0);
      setStatusMsg("正在加载素材与初始化编码器...");

      const cvs = document.createElement("canvas");
      cvs.width = 1920;
      cvs.height = 1080;
      const ctx = cvs.getContext("2d");
      if (!ctx) throw new Error("无法初始化 Canvas 2D 绘图上下文");

      // 加载底图
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("底图加载失败"));
        const prefix = typeof window !== "undefined" && window.location.pathname.startsWith("/vox") ? "/vox/" : "/";
        const cleanPath = (props.image || "screenshots/hockey-page.png").replace(/^\/+/, "");
        img.src = props.image?.startsWith("http") || props.image?.startsWith("data:")
          ? props.image
          : prefix + cleanPath;
      });

      const stream = cvs.captureStream(60);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
        ? "video/mp4;codecs=avc1"
        : (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm");

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const recordFinished = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `vox-paper-video-${Date.now()}.${ext}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          resolve();
        };
      });

      recorder.start();

      const anns = props.annotations || [];
      const totalFrames = durationInFrames || 300;
      const scale = 1920 / (props.imageWidth || 1652);
      const docW = 1920;
      const docH = (props.imageHeight || 1080) * scale;
      const curTheme = props.theme || "light";

      // 逐帧抽帧渲染
      for (let f = 0; f <= totalFrames; f++) {
        ctx.clearRect(0, 0, 1920, 1080);

        // 纯黑背景
        ctx.fillStyle = "#07090d";
        ctx.fillRect(0, 0, 1920, 1080);

        // 相机运镜
        let targetX = docW / 2;
        let targetY = docH / 2;
        let targetZoom = 1.0;

        const sortedAnns = [...anns].sort((a, b) => a.at - b.at);
        let curTarget = sortedAnns[0];
        for (const a of sortedAnns) {
          if (f >= a.at - 15) curTarget = a;
        }

        if (curTarget) {
          const tx = (curTarget.target.x + curTarget.target.width / 2) * scale;
          const ty = (curTarget.target.y + curTarget.target.height / 2) * scale;
          const p = Math.min(1, Math.max(0, (f - (curTarget.at - 15)) / 20));
          const smoothP = 1 - Math.pow(1 - p, 3);
          targetX = (docW / 2) * (1 - smoothP) + tx * smoothP;
          targetY = (docH * 0.35) * (1 - smoothP) + ty * smoothP;
          targetZoom = 1.0 * (1 - smoothP) + 1.45 * smoothP;
        }

        ctx.save();
        ctx.translate(960, 540);
        ctx.scale(targetZoom, targetZoom);
        ctx.translate(-targetX, -targetY);

        ctx.drawImage(img, 0, 0, docW, docH);

        // 绘制标注
        anns.forEach((a) => {
          if (f < a.at) return;
          const localF = f - a.at;
          const dur = a.durationInFrames || 18;
          const progress = Math.min(1, localF / dur);
          const smoothP = 1 - Math.pow(1 - progress, 3);
          const tx = a.target.x * scale;
          const ty = a.target.y * scale;
          const tw = a.target.width * scale;
          const th = a.target.height * scale;

          const col = curTheme === "dark" ? "#38bdf8" : "#1d4ed8";
          const redCol = curTheme === "dark" ? "#f87171" : "#dc2626";
          const yelCol = curTheme === "dark" ? "#fde047" : "#eab308";

          if (a.action === "circle") {
            ctx.strokeStyle = col;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            const r = Math.min(th / 2 + 10, 24);
            if (tw / Math.max(1, th) > 1.4) {
              ctx.roundRect(tx - 6, ty - 6, tw + 12, th + 12, r);
            } else {
              ctx.ellipse(
                tx + tw / 2,
                ty + th / 2,
                tw / 2 + 10,
                th / 2 + 8,
                -0.02,
                0,
                Math.PI * 2 * smoothP
              );
            }
            ctx.stroke();
          } else if (a.action === "highlight") {
            ctx.fillStyle = yelCol;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(tx, ty, tw * smoothP, th);
            ctx.globalAlpha = 1.0;
          } else if (a.action === "underline") {
            ctx.strokeStyle = redCol;
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(tx, ty + th + 4);
            ctx.lineTo(tx + tw * smoothP, ty + th + 4);
            ctx.stroke();
          } else if (a.action === "wavy") {
            ctx.strokeStyle = redCol;
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.beginPath();
            const step = 14;
            const pts = Math.floor((tw * smoothP) / step);
            for (let k = 0; k <= pts; k++) {
              const xPos = tx + k * step;
              const yPos = ty + th + 4 + (k % 2 === 0 ? 0 : 5);
              if (k === 0) ctx.moveTo(xPos, yPos);
              else ctx.lineTo(xPos, yPos);
            }
            ctx.stroke();
          } else if (a.action === "cross") {
            ctx.strokeStyle = redCol;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            const p1 = Math.min(1, smoothP * 1.7);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + tw * p1, ty + th * p1);
            ctx.stroke();
            if (smoothP > 0.3) {
              const p2 = Math.min(1, (smoothP - 0.3) * 1.43);
              ctx.beginPath();
              ctx.moveTo(tx + tw, ty);
              ctx.lineTo(tx + tw - tw * p2, ty + th * p2);
              ctx.stroke();
            }
          } else if (a.action === "box") {
            ctx.strokeStyle = col;
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.strokeRect(tx, ty, tw * smoothP, th * smoothP);
          } else if (a.action === "arrow") {
            ctx.strokeStyle = col;
            ctx.lineWidth = 5.5;
            ctx.lineCap = "round";
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(tx, ty + th / 2);
            ctx.lineTo(tx + tw * smoothP, ty + th / 2);
            ctx.stroke();
            if (smoothP > 0.65) {
              const headP = Math.min(1, (smoothP - 0.65) / 0.35);
              const hx = tx + tw;
              const hy = ty + th / 2;
              ctx.beginPath();
              ctx.moveTo(hx, hy);
              ctx.lineTo(hx - 24 * headP, hy - 14 * headP);
              ctx.lineTo(hx - 24 * headP, hy + 14 * headP);
              ctx.closePath();
              ctx.fill();
            }
          }
        });

        ctx.restore();

        const pct = Math.round((f / totalFrames) * 100);
        setProgress(pct);
        setStatusMsg(`正在进行 60FPS 硬件编码: ${pct}%`);
        await new Promise((resolve) => setTimeout(resolve, 16));
      }

      recorder.stop();
      await recordFinished;
      setStatusMsg("✔ 导出成功，已触发下载！");
      setTimeout(() => {
        setExporting(false);
      }, 2000);
    } catch (err: any) {
      console.error("Export error:", err);
      setStatusMsg(`导出失败: ${err.message}`);
      setTimeout(() => setExporting(false), 3000);
    }
  };

  return (
    <>
      {/* 悬浮在 Studio 画面右上角的极速导出按钮 */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 999999,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={startExport}
          disabled={exporting}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: exporting ? "not-allowed" : "pointer",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.45)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            backdropFilter: "blur(12px)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{exporting ? `导出中 (${progress}%)` : "极速下载视频 (60fps)"}</span>
        </button>
      </div>

      {/* 导出进度遮罩与模态框 */}
      {exporting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 11, 14, 0.75)",
            backdropFilter: "blur(12px)",
            zIndex: 9999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              width: 440,
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 14,
              padding: "24px 28px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
              textAlign: "center",
              color: "#f4f4f5",
              fontFamily: "sans-serif",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              浏览器硬件极速导出
            </div>
            <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 20 }}>
              {statusMsg}
            </div>

            {/* 进度条 */}
            <div
              style={{
                width: "100%",
                height: 8,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 99,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #6366f1, #a855f7)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>

            <div style={{ fontSize: 11, color: "#71717a" }}>
              正在通过显卡硬件编码合成 60FPS 逐帧视频，完成后将自动下载
            </div>
          </div>
        </div>
      )}
    </>
  );
};
