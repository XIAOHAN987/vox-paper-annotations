import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TechCalloutItem } from "../../types/techCallout";

const THEME_COLORS = {
  cyan: {
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.35)",
    cardBg: "rgba(15, 23, 42, 0.88)",
    border: "rgba(56, 189, 248, 0.4)",
    tagBg: "rgba(12, 74, 110, 0.6)",
    tagText: "#7dd3fc",
  },
  amber: {
    accent: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.35)",
    cardBg: "rgba(24, 18, 12, 0.88)",
    border: "rgba(245, 158, 11, 0.4)",
    tagBg: "rgba(120, 53, 15, 0.6)",
    tagText: "#fcd34d",
  },
  emerald: {
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.35)",
    cardBg: "rgba(6, 26, 20, 0.88)",
    border: "rgba(52, 211, 153, 0.4)",
    tagBg: "rgba(6, 78, 59, 0.6)",
    tagText: "#6ee7b7",
  },
  rose: {
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.35)",
    cardBg: "rgba(28, 10, 16, 0.88)",
    border: "rgba(244, 63, 94, 0.4)",
    tagBg: "rgba(136, 19, 55, 0.6)",
    tagText: "#fda4af",
  },
};

export const VoxTechCallout: React.FC<TechCalloutItem> = ({
  at,
  durationInFrames = 28,
  target,
  cardPos,
  tag = "PARAMETER",
  title,
  metrics = [],
  colorTheme = "cyan",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - at;

  // 计算 45 度 CAD 机械折线路径
  const { pathD, totalLength, attachX, attachY } = useMemo(() => {
    const [tx, ty] = target;
    const [cx, cy] = cardPos;

    // 决定卡片在目标的左侧还是右侧
    const isRight = cx >= tx;
    const cardW = 260;
    const connectX = isRight ? cx : cx + cardW;
    const connectY = cy + 24;

    // 45° 折角中间点
    const dx = connectX - tx;
    const dy = connectY - ty;
    const elbowDist = Math.min(Math.abs(dx) * 0.5, Math.abs(dy));
    const elbowX = tx + (isRight ? elbowDist : -elbowDist);
    const elbowY = ty + (dy > 0 ? elbowDist : -elbowDist);

    const d = `M ${tx} ${ty} L ${elbowX} ${elbowY} L ${connectX} ${connectY}`;
    const len =
      Math.hypot(elbowX - tx, elbowY - ty) + Math.hypot(connectX - elbowX, connectY - elbowY);

    return {
      pathD: d,
      totalLength: len * 1.05,
      attachX: connectX,
      attachY: connectY,
    };
  }, [target, cardPos]);

  const lineGrow = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.8 },
    durationInFrames: Math.round(durationInFrames * 0.55),
  });

  const cardGrow = spring({
    frame: Math.max(0, localFrame - 8),
    fps,
    config: { damping: 16, stiffness: 140, mass: 0.7 },
    durationInFrames: Math.round(durationInFrames * 0.6),
  });

  if (localFrame < 0) return null;

  const theme = THEME_COLORS[colorTheme] ?? THEME_COLORS.cyan;

  // 雷达波纹脉冲
  const radarScale = ((localFrame % 30) / 30) * 1.8 + 0.6;
  const radarOpacity = Math.max(0, 1 - (localFrame % 30) / 30);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {/* 1. 矢量 SVG 引线与雷达瞄准锚点 */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        <defs>
          <filter id={`tech-glow-${colorTheme}`}>
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 瞄准点扩散雷达环 */}
        <circle
          cx={target[0]}
          cy={target[1]}
          r={12 * radarScale}
          fill="none"
          stroke={theme.accent}
          strokeWidth="1.5"
          opacity={radarOpacity * lineGrow}
        />

        {/* 瞄准十字芯点 */}
        <circle
          cx={target[0]}
          cy={target[1]}
          r={4}
          fill={theme.accent}
          opacity={lineGrow}
        />

        {/* 45° CAD 机械发光主折线 */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2}
          strokeDasharray={totalLength}
          strokeDashoffset={totalLength * (1 - lineGrow)}
          filter={`url(#tech-glow-${colorTheme})`}
        />

        {/* 引线端点连接十字小标 */}
        {lineGrow > 0.8 && (
          <circle
            cx={attachX}
            cy={attachY}
            r={3}
            fill={theme.accent}
          />
        )}
      </svg>

      {/* 2. HUD 半透明冷灰玻璃参数卡片 */}
      <div
        style={{
          position: "absolute",
          left: cardPos[0],
          top: cardPos[1],
          width: 260,
          background: theme.cardBg,
          backdropFilter: "blur(12px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          padding: "10px 14px",
          boxShadow: `0 8px 30px rgba(0,0,0,0.8), 0 0 15px ${theme.glow}`,
          transform: `scale(${cardGrow})`,
          transformOrigin: cardPos[0] >= target[0] ? "0 20px" : "100% 20px",
          opacity: interpolate(cardGrow, [0, 0.4, 1], [0, 0.8, 1]),
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`,
        }}
      >
        {/* 四角机械微刻度角标 */}
        <div style={{ position: "absolute", top: -1, left: -1, width: 6, height: 6, borderTop: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, borderTop: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", bottom: -1, left: -1, width: 6, height: 6, borderBottom: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", bottom: -1, right: -1, width: 6, height: 6, borderBottom: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />

        {/* 顶部分类标签 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              background: theme.tagBg,
              color: theme.tagText,
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            {tag.toUpperCase()}
          </span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }} />
        </div>

        {/* 主标题 */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: 8,
            letterSpacing: 0.5,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: 4,
          }}
        >
          {title}
        </div>

        {/* 参数键值列表 (打字机效果) */}
        {metrics.map((m, idx) => {
          const itemDelay = 12 + idx * 4;
          const charCount = Math.max(0, Math.floor((localFrame - itemDelay) * 1.5));
          if (localFrame < itemDelay) return null;

          const valText = m.value.slice(0, charCount);

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
                marginBottom: 3,
                fontFamily: "monospace",
              }}
            >
              <span style={{ color: "#94a3b8" }}>{m.label}:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: m.highlight ? theme.accent : "#f1f5f9",
                  textShadow: m.highlight ? `0 0 8px ${theme.glow}` : "none",
                }}
              >
                {valText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
