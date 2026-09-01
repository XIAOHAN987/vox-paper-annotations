import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const RENDERS_DIR = path.join(PUBLIC_DIR, "renders");
const PORT = 3008;

if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

let currentRenderProcess = null;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 保存 JSON API (严格安全限制: 仅允许写入 public/scripts/*.json，杜绝目录穿越)
  if (req.method === "POST" && req.url.startsWith("/api/save")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        let rawPath = String(data.path || "scripts/vox-script.json").trim();
        // 过滤任何 ../ 与非法字符
        const safeBaseName = path.basename(rawPath);
        if (!safeBaseName.endsWith(".json")) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: "Only .json files are permitted" }));
          return;
        }
        
        const scriptsDir = path.join(PUBLIC_DIR, "scripts");
        fs.mkdirSync(scriptsDir, { recursive: true });
        const fullPath = path.join(scriptsDir, safeBaseName);

        // 二次边界断言：确保文件绝对不会溢出 scripts 目录
        if (!fullPath.startsWith(scriptsDir)) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: "Forbidden directory access" }));
          return;
        }

        const content =
          typeof data.content === "string"
            ? data.content
            : JSON.stringify(data.content, null, 2);
        fs.writeFileSync(fullPath, content, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, path: `scripts/${safeBaseName}` }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 工业级原生 Remotion 离线像素无损渲染 API (SSE 实时进度流)
  if (req.url.startsWith("/api/render")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("status", { progress: 5, message: "正在启动 Remotion 渲染内核..." });

    const outFileName = `vox-render-${Date.now()}.mp4`;
    const outFilePath = path.join(RENDERS_DIR, outFileName);

    const isWin = process.platform === "win32";
    const npxCmd = isWin ? "npx.cmd" : "npx";
    const args = [
      "remotion",
      "render",
      "src/index.ts",
      "VOX-纸张手绘标注",
      `public/renders/${outFileName}`,
      "--overwrite",
    ];

    const renderProc = spawn(npxCmd, args, {
      cwd: __dirname,
      shell: isWin,
    });
    currentRenderProcess = renderProc;

    let maxFrames = 300;
    let currentRendered = 0;

    renderProc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/Rendered (\d+)\/(\d+)/);
      if (match) {
        currentRendered = parseInt(match[1], 10);
        maxFrames = parseInt(match[2], 10) || maxFrames;
        const pct = Math.min(95, Math.round((currentRendered / maxFrames) * 90) + 5);
        sendEvent("progress", {
          progress: pct,
          message: `正在无损渲染第 ${currentRendered}/${maxFrames} 帧 (${pct}%)`,
        });
      } else if (text.includes("Encoded")) {
        sendEvent("progress", { progress: 98, message: "正在压制 H.264 母带音频与视频轨..." });
      }
    });

    renderProc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/Rendered (\d+)\/(\d+)/);
      if (match) {
        currentRendered = parseInt(match[1], 10);
        maxFrames = parseInt(match[2], 10) || maxFrames;
        const pct = Math.min(95, Math.round((currentRendered / maxFrames) * 90) + 5);
        sendEvent("progress", {
          progress: pct,
          message: `正在无损渲染第 ${currentRendered}/${maxFrames} 帧 (${pct}%)`,
        });
      }
    });

    renderProc.on("close", (code) => {
      currentRenderProcess = null;
      if (code === 0 && fs.existsSync(outFilePath)) {
        sendEvent("complete", {
          progress: 100,
          url: `/vox/renders/${outFileName}`,
          directUrl: `/renders/${outFileName}`,
          fileName: outFileName,
          message: "渲染完成！",
        });
      } else {
        sendEvent("error", {
          message: `渲染失败 (退出码 ${code})，请检查配置`,
        });
      }
      res.end();
    });

    return;
  }

  // 静态资源分发
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/marker.html";
  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`VOX Marker Server running on http://localhost:${PORT}`);
});

// 自动安全清理：每 30 分钟扫描并销毁超过 1 小时的临时渲染视频
function cleanOldRenders() {
  try {
    if (!fs.existsSync(RENDERS_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(RENDERS_DIR);
    for (const f of files) {
      if (!f.startsWith("vox-render-") && !f.startsWith("vox-video-")) continue;
      const full = path.join(RENDERS_DIR, f);
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > 60 * 60 * 1000) { // 超过 1 小时自动删除
        fs.unlinkSync(full);
      }
    }
  } catch (_) {}
}
setInterval(cleanOldRenders, 30 * 60 * 1000);
cleanOldRenders();
