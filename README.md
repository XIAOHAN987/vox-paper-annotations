# VOX Paper Annotation Suite for Remotion

基于 Remotion 与 React 构建的纪录片风格纸张手绘标注系统与可视化打标工作台。专为知识科普、商业分析、新闻解读与深度报道类视频设计，呈现原汁原味的墨水毛边、动态纸张微噪点与从容平滑的 Ken Burns 运镜。

---

## 核心特性

- **真实手绘墨水毛边滤镜**：基于 SVG `feTurbulence` 与 `feDisplacementMap`，赋予手绘圆圈、马克笔荧光高亮、下划线、波浪线、箭头与打叉真实的微颤抖与有机毛边质感。
- **自适应纸张胶片微噪点 (Film Grain)**：白底纸张自动采用 `multiply` 正片叠底与显微纤维噪点，深色模式自适应 `screen`，支持 0%~100% 无级调节与一键启闭。
- **智能相机从容运镜 (Ken Burns)**：根据标注时间轴自动计算视觉焦点，生成平滑机位过渡与慢速微推，告别死板贴图。
- **零代码可视化打标工作台**：支持本地图片拖拽导入、鼠标划选文字区域、多类型标注混排与实时时间轴排布。
- **工业级 60FPS 像素级无损导出**：集成 Remotion 原生渲染内核与 SSE 实时流式进度反馈，输出高质量 H.264 MP4 视频母带。

---

## 快速上手

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发与打标工作台

```bash
# 启动标注工作台服务 (端口 3008)
node server.mjs

# 启动 Remotion Studio 播放器 (端口 3000)
npm run dev
```

启动后访问：
- 打标工作台：`http://localhost:3008/marker.html`
- Remotion Studio 播放器：`http://localhost:3000/`

### 3. 命令行渲染输出

```bash
npx remotion render src/index.ts VOX-纸张手绘标注 out/vox-video.mp4
```

---

## 项目结构

```
├── public/
│   ├── marker.html               # 可视化打标工作台前端
│   ├── scripts/                  # 标注数据存储目录 (JSON)
│   ├── screenshots/              # 预设与示例素材底图
│   └── textures/                 # 纸张与胶片噪点纹理
├── src/
│   ├── components/vox/           # 手绘 SVG 组件库 (圆圈/高亮/划线/箭头/滤镜)
│   ├── compositions/             # Remotion 核心场景合成
│   ├── Root.tsx                  # Remotion Composition 注册入口
│   └── index.ts                  # Remotion 打包主入口
├── server.mjs                    # 轻量 HTTP 服务与原生渲染 API
└── remotion.config.ts            # Remotion 编译器与无头浏览器配置
```

---

## 致谢 (Acknowledgments)

本项目核心动效与视觉设计思路来自于 YouTube 创作者 **Chris Moran**。特此致谢！

---

## 开源协议

本项目采用 MIT 协议开源。
