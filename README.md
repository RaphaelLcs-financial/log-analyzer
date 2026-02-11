# @raphaellcs/log-analyzer
[![npm](https://img.shields.io/npm/v/@raphaellcs/log-analyzer)](https://www.npmjs.com/package/@raphaellcs/log-analyzer)
[![downloads](https://img.shields.io/npm/dm/@raphaellcs/log-analyzer)](https://www.npmjs.com/package/@raphaellcs/log-analyzer)
[![license](https://img.shields.io/npm/l/@raphaellcs/log-analyzer)](https://www.npmjs.com/package/@raphaellcs/log-analyzer)

> 日志分析工具 - 快速分析日志文件，提取关键信息

## 🚀 功能

- **日志分析**：统计日志级别、错误、警告
- **模式搜索**：快速查找包含特定内容的日志
- **实时监控**：监控日志文件变化，实时输出
- **导出结果**：导出为 JSON 或 CSV 格式
- **时间范围**：自动识别时间戳并计算持续时间
- **格式兼容**：支持多种日志格式
- **异常检测**：检测错误突增、重复错误、趋势变化（新）
- **错误分类**：自动将错误分类（数据库、网络、内存等）（新）
- **多文件聚合**：同时分析多个日志文件（新）

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

### 2. 导出分析结果

**导出为 JSON：**

```bash
log-analyzer analyze app.log --output result.json --format json
```

**导出为 CSV：**

```bash
log-analyzer analyze app.log --output result.csv --format csv
```

JSON 输出示例：

```json
{
  "totalLines": 1523,
  "levels": {
    "INFO": 1200,
    "DEBUG": 300,
    "WARN": 20,
    "ERROR": 3
  },
  "errors": [
    {
      "line": 234,
      "timestamp": "2024-02-11T14:23:45.000Z",
      "message": "Connection timeout"
    }
  ],
  "warnings": [
    {
      "line": 45,
      "timestamp": "2024-02-11T12:34:56.000Z",
      "message": "Slow query detected"
    }
  ],
  "timeRange": {
    "start": "2024-02-11T10:00:00.000Z",
    "end": "2024-02-11T18:00:00.000Z",
    "duration": 28800000
  }
}
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

### 4. 异常检测

检测日志中的异常情况：

```bash
log-analyzer detect app.log
```

自定义检测阈值：

```bash
log-analyzer detect app.log --error-spike-threshold 10 --error-spike-window 2
```

导出检测结果：

```bash
log-analyzer detect app.log --output anomalies.json
```

检测示例输出：

```
🔍 异常检测结果

发现 2 个异常:

⚠️  ERROR_SPIKE
   严重程度: HIGH
   时间: 2024-02-11 10:10:00
   描述: 检测到错误突增：1分钟内 7 个错误
   影响行: 7, 8, 9, 10, 11...

⚠️  REPEATED_ERROR
   严重程度: HIGH
   时间: N/A
   描述: connection timeout to database server
   影响行: 7, 8, 9, 10, 11...

📂 错误分类:

  DATABASE: 7 个错误
  MEMORY: 1 个错误
```

### 5. 多文件聚合

同时分析多个日志文件：

```bash
log-analyzer aggregate app.log nginx.log system.log
```

扫描目录中的所有日志文件：

```bash
log-analyzer aggregate --directory /var/log --exclude node_modules,.git
```

使用通配符匹配：

```bash
log-analyzer aggregate --pattern "logs/**/*.log"
```

导出聚合结果：

```bash
log-analyzer aggregate app.log nginx.log --output summary.json
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

### 5. 异常检测

检测系统异常情况：

```bash
log-analyzer detect app.log
```

自动检测：
- 错误突增：1分钟内错误数量超过阈值
- 重复错误：同一错误重复出现多次
- 错误分类：自动将错误分类（数据库、网络、内存等）

### 6. 多文件聚合

聚合分析多个服务的日志：

```bash
log-analyzer aggregate --directory /var/log/app --output report.json
```

适用于微服务架构、多实例部署的场景。

### 7. DevOps 运维

监控生产环境日志：

```bash
# 实时监控错误
log-analyzer watch production.log --level ERROR

# 定期检测异常（配合 cron）
log-analyzer detect production.log --output anomalies.json

# 聚合分析所有服务日志
log-analyzer aggregate --directory /var/log --exclude .git
```

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

### 异常检测详解

**1. 错误突增检测**

自动检测短时间内错误数量的突然增加：

```bash
log-analyzer detect app.log --error-spike-threshold 5 --error-spike-window 1
```

- `--error-spike-threshold`: 触发阈值（默认：5个错误/分钟）
- `--error-spike-window`: 时间窗口（默认：1分钟）

**2. 重复错误检测**

检测重复出现的错误：

```bash
log-analyzer detect app.log --repeat-threshold 3
```

- `--repeat-threshold`: 重复次数阈值（默认：3次）

**3. 错误自动分类**

自动将错误分类：

- DATABASE: 数据库相关错误
- NETWORK: 网络和连接错误
- AUTHENTICATION: 认证和授权错误
- FILE_SYSTEM: 文件系统错误
- MEMORY: 内存相关错误
- VALIDATION: 数据验证错误
- OTHER: 其他错误

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

### 多文件聚合选项

**目录扫描：**

```bash
log-analyzer aggregate --directory /var/log
```

**排除特定目录：**

```bash
log-analyzer aggregate --directory /var/log --exclude node_modules,.git
```

**通配符匹配：**

```bash
log-analyzer aggregate --pattern "logs/**/*.log"
log-analyzer aggregate --pattern "app-*.log"
```

## 🔧 配置选项

### 分析

| 参数 | 说明 |
|------|------|
| `<file>` | 日志文件路径 |
| `--patterns <items>` | 搜索模式（逗号分隔）|
| `--limit <number>` | 限制显示数量 |
| `--output <file>` | 导出结果到文件（不指定则输出到控制台）|
| `--format <type>` | 导出格式：json（默认）或 csv |

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

### 异常检测

| 参数 | 说明 |
|------|------|
| `<file>` | 日志文件路径 |
| `--error-spike-threshold <number>` | 错误突增阈值（默认：5）|
| `--error-spike-window <minutes>` | 时间窗口（分钟，默认：1）|
| `--repeat-threshold <number>` | 重复错误阈值（默认：3）|
| `--output <file>` | 导出结果到文件（JSON格式）|

### 聚合分析

| 参数 | 说明 |
|------|------|
| `<files...>` | 日志文件路径列表 |
| `-d, --directory <path>` | 扫描目录中的日志文件 |
| `-p, --pattern <glob>` | 使用通配符模式匹配文件 |
| `--exclude <items>` | 排除的目录（逗号分隔）|
| `-o, --output <file>` | 导出结果到文件（JSON格式）|
| `-f, --format <type>` | 导出格式（json/csv）|

## 🚧 待实现

- [ ] 支持更多日志格式
- [ ] 图形化展示
- [ ] 告警通知（邮件、Slack、钉钉等）
- [ ] 日志趋势预测

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT © 梦心

---

Made with 🌙 by 梦心
