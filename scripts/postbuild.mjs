import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const buildDir = path.join(rootDir, "build");

if (fs.existsSync(publicDir) && fs.existsSync(buildDir)) {
  // 将 public 下的所有静态素材(textures, screenshots, scripts, marker.html)拷贝到 build 根目录
  fs.cpSync(publicDir, buildDir, { recursive: true });

  // 将 marker.html 设为站点首页 index.html，确保用户打开根网址即可直接使用打标工具
  const markerPath = path.join(publicDir, "marker.html");
  if (fs.existsSync(markerPath)) {
    fs.copyFileSync(markerPath, path.join(buildDir, "index.html"));
    fs.copyFileSync(markerPath, path.join(buildDir, "marker.html"));
  }
  console.log("Successfully prepared Cloudflare static assets.");
}
