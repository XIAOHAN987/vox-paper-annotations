// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);
// 使用系统 Chrome 渲染,避免下载 headless shell(WorkBuddy 沙箱会拦截下载锁删除)
Config.setBrowserExecutable("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
