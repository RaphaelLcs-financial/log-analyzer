# @claw-dev/log-analyzer

> 日志分析工具 - 快速分析日志文件，提取关键信息

## 🚀 功能

- **日志分析**：统计日志级别、错误、警告
- **模式搜索**：快速查找包含特定内容的日志
- **实时监控**：监控日志文件变化，实时输出
- **时间范围**：自动识别时间戳并计算持续时间
- **格式兼容**：支持多种日志格式

## 📦 安装

```bash
npx @claw-dev/log-analyzer
```

## 📖 快速开始

### 1. 分析日志

```bash
log-analyzer analyze app.log
```

输出示例：

```
📊 日志统计

总行数: 1523
时间范围: 2024-02-11T10:00:00.000Z ~ 2024-02-11T18:00:00.000Z
持续时间: 8 hours

日志级别:
  INFO       1200 次
  DEBUG       300 次
  WARN         20 次
  ERROR         3 次

❌ 错误 (3):
  [234] Connection timeout
  [567] Database error
  [890] File not found

⚠️  警告 (20):
  [45] Slow query detected
  [67] Memory usage high
  ...
```

### 2. 搜索日志

```bash
log-analyzer search app.log "error"
```

限制显示数量：

```bash
log-analyzer search app.log "timeout" --limit 5
```

### 3. 实时监控

```bash
log-analyzer watch app.log
```

只显示错误和警告：

```bash
log-analyzer watch app.log --level WARN
```

调整检查间隔：

```bash
log-analyzer watch app.log --interval 500
```

## 📋 支持的日志格式

### 标准格式

```
[2024-02-11 18:00:00] [INFO] Server started
```

### Nginx 格式

```
2024/02/11 18:00:00 [info] Request received
```

### Syslog 格式

```
Feb 11 18:00:00 myserver message
```

### 简单格式

```
ERROR: Something went wrong
INFO: Process completed
```

## 🎯 使用场景

### 1. 快速查看错误

```bash
log-analyzer analyze app.log
```

快速定位所有错误和警告。

### 2. 搜索特定问题

```bash
log-analyzer search app.log "timeout"
log-analyzer search app.log "database"
log-analyzer search app.log "user@example.com"
```

### 3. 实时监控

```bash
log-analyzer watch app.log --level ERROR
```

只看错误，实时发现问题。

### 4. 模式统计

```bash
log-analyzer analyze app.log --patterns "error,timeout,failed"
```

统计特定模式的出现次数。

## 📊 输出说明

### 日志级别

| 级别 | 颜色 | 说明 |
|------|------|------|
| ERROR | 红色 | 错误 |
| WARN | 黄色 | 警告 |
| INFO | 青色 | 信息 |
| DEBUG | 灰色 | 调试 |

### 时间范围

自动识别日志中的时间戳，显示：

- 开始时间
- 结束时间
- 持续时间

### 统计信息

- 总行数
- 各级别日志数量
- 错误列表
- 警告列表

## 💡 高级功能

### 过滤日志级别

```bash
log-analyzer watch app.log --level ERROR
```

只会显示 ERROR 和更高级别的日志（按 ERROR > WARN > INFO > DEBUG 排序）。

### 限制输出

```bash
log-analyzer analyze app.log --limit 10
log-analyzer search app.log "error" --limit 5
```

限制错误/搜索结果的显示数量。

### 多模式搜索

```bash
log-analyzer analyze app.log --patterns "error,timeout,slow"
```

统计多个模式的出现次数。

## 🔧 配置选项

### 分析

| 参数 | 说明 |
|------|------|
| `<file>` | 日志文件路径 |
| `--patterns <items>` | 搜索模式（逗号分隔）|
| `--limit <number>` | 限制显示数量 |

### 搜索

| 参数 | 说明 |
|------|------|
| `<file>` | 日志文件路径 |
| `<query>` | 搜索内容 |
| `--limit <number>` | 限制显示数量 |

### 监控

| 参数 | 说明 |
|------|------|
| `<file>` | 日志文件路径 |
| `--interval <ms>` | 检查间隔（毫秒），默认 1000 |
| `--level <level>` | 最低日志级别（ERROR/WARN/INFO/DEBUG）|

## 🚧 待实现

- [ ] 支持更多日志格式
- [ ] 导出分析结果（JSON/CSV）
- [ ] 图形化展示
- [ ] 日志聚合分析
- [ ] 告警通知

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT © 梦心

---

Made with 🌙 by 梦心
