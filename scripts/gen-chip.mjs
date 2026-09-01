import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outPath = path.join(rootDir, "public", "screenshots", "tech-chip.svg");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#141a29"/>
      <stop offset="100%" stop-color="#07090d"/>
    </radialGradient>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- 背景 -->
  <rect width="100%" height="100%" fill="url(#bgGlow)"/>
  <rect width="100%" height="100%" fill="url(#gridPattern)"/>

  <!-- 芯片母板 (Motherboard Substrate) -->
  <rect x="360" y="160" width="1200" height="760" rx="16" fill="url(#metal)" stroke="#334155" stroke-width="2"/>

  <!-- 科技走线 (PCB Traces) -->
  <g stroke="rgba(56, 189, 248, 0.25)" stroke-width="1.5" fill="none">
    <path d="M 360 260 L 500 260 L 580 340 L 700 340"/>
    <path d="M 360 380 L 540 380 L 620 460 L 700 460"/>
    <path d="M 360 700 L 520 700 L 600 620 L 700 620"/>
    <path d="M 360 820 L 540 820 L 620 740 L 700 740"/>
    <path d="M 1560 260 L 1420 260 L 1340 340 L 1220 340"/>
    <path d="M 1560 380 L 1380 380 L 1300 460 L 1220 460"/>
    <path d="M 1560 700 L 1400 700 L 1320 620 L 1220 620"/>
    <path d="M 1560 820 L 1380 820 L 1300 740 L 1220 740"/>
  </g>

  <!-- 中央主处理器 (Central NPU / AI Core) -->
  <rect x="700" y="280" width="520" height="520" rx="12" fill="#090d16" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8 4"/>
  <rect x="740" y="320" width="440" height="440" rx="8" fill="url(#coreGlow)" opacity="0.15"/>

  <!-- 计算核心阵列 (Compute Units Matrix) -->
  <g fill="#0f172a" stroke="#0284c7" stroke-width="1.5">
    <rect x="760" y="340" width="180" height="180" rx="6"/>
    <rect x="980" y="340" width="180" height="180" rx="6"/>
    <rect x="760" y="560" width="180" height="180" rx="6"/>
    <rect x="980" y="560" width="180" height="180" rx="6"/>
  </g>

  <!-- 核心内部细节与文字 -->
  <text x="850" y="440" fill="#38bdf8" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">TENSOR_CORE_01</text>
  <text x="1070" y="440" fill="#38bdf8" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">TENSOR_CORE_02</text>
  <text x="850" y="660" fill="#38bdf8" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">VECTOR_ENGINE_A</text>
  <text x="1070" y="660" fill="#38bdf8" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">VECTOR_ENGINE_B</text>

  <!-- 高速内存通道 (HBM3 Stack) -->
  <rect x="420" y="360" width="140" height="360" rx="6" fill="#090d16" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="490" y="545" fill="#94a3b8" font-size="13" font-family="monospace" font-weight="bold" text-anchor="middle" transform="rotate(-90 490 545)">HBM3E_STACK_32GB</text>

  <rect x="1360" y="360" width="140" height="360" rx="6" fill="#090d16" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="1430" y="545" fill="#94a3b8" font-size="13" font-family="monospace" font-weight="bold" text-anchor="middle" transform="rotate(90 1430 545)">PCIE_GEN5_BUS_X16</text>

  <!-- 顶部主标题 -->
  <text x="960" y="110" fill="#f8fafc" font-size="28" font-family="sans-serif" font-weight="800" text-anchor="middle" letter-spacing="4">NEURAL PROCESSING ARCHITECTURE</text>
  <text x="960" y="138" fill="#64748b" font-size="12" font-family="monospace" text-anchor="middle" letter-spacing="2">DIE LEVEL COMPUTE &amp; MEMORY TOPOLOGY</text>
</svg>`;

fs.writeFileSync(outPath, svg);
console.log("Created tech-chip.svg at:", outPath);
