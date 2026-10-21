### 而且创意(深圳)让科技+艺术感知生命

randomArt可视化创意编程是款纯前端p5.js/three.js创意编程工具，内置AI助手。所有数据仅存本地浏览器，无需后端打开即可离线使用

---

#### 功能

##### 运行器（首页）
- 随机加载并运行内置p5.js脚本
- 侧边栏查看、搜索、重命名、删除已保存作品
- 点击作品标题全屏预览；预览模式锁定设备宽高，横竖屏自动适配
- p5.js/three.js作品均支持PNG截图
- 主文档双指/多指手势锁定，避免误缩放

##### 编写脚本（编辑器）
- CodeMirror 5编辑器：语法高亮、行号、草稿自动保存
- **双引擎切换**：右上角`p5.js`/`three.js`按钮即时切换
- 上传图片（自动压缩至长边1024px，会话级），脚本通过`imageUrl`引用
- AI生成面板：用自然语言描述效果，AI通过工具调用把代码写入编辑器
- 编辑器已有内容时可选「覆盖」或「基于现有代码修改」
- 提交后可预览、下载单个HTML文件

##### three.js引擎
- `THREE`自动注入为全局变量，用户代码直接使用`THREE.Scene`等
- 无需写`import`语句
- 不使用`OrbitControls`/addons（环境限制），相机手势需手写`TouchEvent`
- 截图功能已通过强制`preserveDrawingBuffer: true`支持

##### AI 助手
- 支持ChatGPT、Gemini、DeepSeek流式对话
- 可自定义OpenAI兼容模型（Endpoint / API Model / Tools / Vision）
- 每个模型独立配置API Key与系统提示词
- 测试连接、重新生成、删除、复制消息
- 对话导出Markdown/JSON（含 `finish_reason`、`usage`、`tool_calls` 等元数据）
- 从JSON文件导入对话（支持追加或覆盖）

##### 设置
- 参数调整：图片上限、工具调用轮次、上下文长度、请求超时、标题长度
- 中英文切换（静态与动态文本均即时更新）
- 本地存储管理：查看各项大小、单项删除、打包备份、导入备份、导出全部作品ZIP
- 亮/暗主题切换（CodeMirror主题同步）

---

#### 技术栈

| 层 | 技术 | 引入方式 |
|---|---|---|
| 编辑器 | CodeMirror 5.65.16 | CDN UMD（`window.CodeMirror`） |
| 压缩 | JSZip 3.10.1 | CDN UMD（`window.JSZip`） |
| 图形 | p5.js 1.9.0 / three.js 0.186.0 | 运行时 CDN |
| 部署 | GitHub Pages | 纯静态，无构建 |

---
