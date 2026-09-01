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
      setProgress(5);
      setStatusMsg("正在连接 Remotion 工业级渲染引擎...");

      // 1. 先保存最新标注数据确保渲染与当前画面一致
      const isLocalStudio = typeof window !== "undefined" && window.location.port === "3000";
      const apiBase = isLocalStudio ? "http://localhost:3008" : "/vox";
      try {
        await fetch(`${apiBase}/api/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "scripts/vox-script.json",
            content: props,
          }),
        });
      } catch (_) {}

      // 2. 触发原生 Remotion SSE 渲染流
      const renderApiUrl = `${apiBase}/api/render`;
      const eventSource = new EventSource(renderApiUrl);

      eventSource.addEventListener("status", (ev: any) => {
        try {
          const data = JSON.parse(ev.data);
          setProgress(data.progress || 10);
          setStatusMsg(data.message || "正在准备渲染...");
        } catch (_) {}
      });

      eventSource.addEventListener("progress", (ev: any) => {
        try {
          const data = JSON.parse(ev.data);
          setProgress(data.progress);
          setStatusMsg(data.message || `正在渲染中 (${data.progress}%)...`);
        } catch (_) {}
      });

      eventSource.addEventListener("complete", (ev: any) => {
        try {
          const data = JSON.parse(ev.data);
          setProgress(100);
          setStatusMsg("✔ 渲染成功，正在下载母带视频...");
          eventSource.close();

          // 自动触发浏览器下载
          const downloadUrl = data.url || data.directUrl;
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = data.fileName || `vox-render-${Date.now()}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => {
            setExporting(false);
          }, 2000);
        } catch (_) {
          setExporting(false);
          eventSource.close();
        }
      });

      eventSource.addEventListener("error", (ev: any) => {
        try {
          const data = JSON.parse(ev.data);
          setStatusMsg(`渲染遇到错误: ${data.message}`);
        } catch (_) {
          setStatusMsg("渲染连接中断，请重试");
        }
        eventSource.close();
        setTimeout(() => setExporting(false), 3500);
      });

      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (err: any) {
      console.error("Export error:", err);
      setStatusMsg(`导出遇到问题: ${err.message}`);
      setTimeout(() => setExporting(false), 3000);
    }
  };

  return (
    <>
      {/* 悬浮在 Studio 画面右上角的高清大号原生下载按钮 */}
      <div
        style={{
          position: "fixed",
          top: 36,
          right: 36,
          zIndex: 999999,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={startExport}
          disabled={exporting}
          style={{
            background: "rgba(18, 18, 22, 0.94)",
            color: "#ffffff",
            border: "2px solid rgba(255, 255, 255, 0.22)",
            padding: "16px 36px",
            borderRadius: "14px",
            fontSize: "26px",
            fontWeight: 650,
            cursor: exporting ? "not-allowed" : "pointer",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.18s ease",
            backdropFilter: "blur(16px)",
            letterSpacing: "0.5px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif",
          }}
          onMouseEnter={(e) => {
            if (!exporting) {
              e.currentTarget.style.background = "rgba(36, 36, 42, 0.98)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!exporting) {
              e.currentTarget.style.background = "rgba(18, 18, 22, 0.94)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{exporting ? `渲染中 (${progress}%)` : "下载视频"}</span>
        </button>
      </div>

      {/* 导出进度遮罩与高清大号模态框 */}
      {exporting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 8, 12, 0.85)",
            backdropFilter: "blur(20px)",
            zIndex: 9999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              width: 720,
              background: "#18181c",
              border: "2px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 24,
              padding: "44px 52px",
              boxShadow: "0 36px 90px rgba(0, 0, 0, 0.9)",
              textAlign: "center",
              color: "#fafafa",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 18, letterSpacing: "0.5px" }}>
              Remotion 电影级像素无损导出
            </div>
            <div style={{ fontSize: 22, color: "#a1a1aa", marginBottom: 32 }}>
              {statusMsg}
            </div>

            {/* 高清大号进度条 */}
            <div
              style={{
                width: "100%",
                height: 14,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 99,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #a1a1aa, #ffffff)",
                  transition: "width 0.2s ease-out",
                }}
              />
            </div>

            <div style={{ fontSize: 16, color: "#71717a" }}>
              采用服务端 Remotion 原生渲染引擎逐帧压制，100% 还原手绘纸张滤镜与线条质感
            </div>
          </div>
        </div>
      )}
    </>
  );
};
