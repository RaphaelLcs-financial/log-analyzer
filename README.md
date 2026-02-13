# log-analyzer

[![npm version](https://badge.fury.io/js/@raphaellcs%2Flog-analyzer.svg)](https://badge.fury.io/js/@raphaellcs%2Flog-analyzer)
[![npm downloads](https://img.shields.io/npm/dm/@raphaellcs/log-analyzer.svg)](https://www.npmjs.com/package/@raphaellcs/log-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/RaphaelLcs-financial/log-analyzer.svg?style=social)](https://github.com/RaphaelLcs-financial/log-analyzer)

日志分析工具 - 快速分析日志文件，提取关键信息

## 功能

- **日志分析**：统计日志级别、错误、警告数量
- **模式搜索**：快速查找包含特定内容的日志
- **实时监控**：监控日志文件变化，实时输出
- **异常检测**：检测错误突增、重复错误、趋势分析
- **错误分类**：自动将错误分类（数据库、网络、内存、文件系统等）
- **多文件聚合**：同时分析多个日志文件
- **日志归档**：归档旧日志文件，支持 gzip 压缩

## 安装

```bash
# 使用 npx 直接运行（推荐）
npx @raphaellcs/log-analyzer analyze app.log

# 全局安装
npm install -g @raphaellcs/log-analyzer

# 然后使用
log-analyzer analyze app.log
```

## 使用方法

### 日志分析

```bash
# 分析单个日志
log-analyzer analyze app.log

# 指定输出格式
log-analyzer analyze app.log -o result.json -f json

# 只显示错误
log-analyzer analyze app.log --only-errors
```

### 异常检测

```bash
# 检测异常
log-analyzer detect app.log

# 检测错误突增
log-analyzer detect app.log --spike-threshold 5

# 检测重复错误
log-analyzer detect app.log --repeat-threshold 3

# 检测趋势变化
log-analyzer detect app.log --trend-window 300
```

### 多文件聚合

```bash
# 聚合多个日志
log-analyzer aggregate logs/*.log

# 递归聚合目录
log-analyzer aggregate logs/ -r

# 指定输出格式
log-analyzer aggregate logs/*.log -o summary.json -f json
```

### 日志归档

```bash
# 归档单个文件
log-analyzer archive app.log

# 归档到指定目录
log-analyzer archive app.log --archive-dir ./archive

# 归档并压缩
log-analyzer archive app.log --compress

# 归档目录
log-analyzer archive-dir /var/log/myapp --compress

# 显示归档统计
log-analyzer archive-stats --archive-dir ./archive
```


## 可视化功能

**可视化命令**：charts

**核心功能**：
- **日志趋势图**（折线图）- 显示日志级别随时间的变化
- **日志级别分布图**（饼图）- 显示各级别的占比
- **错误类型分布图**（柱状图）- 显示各错误类型的数量
- **生成交互式 HTML 报告** - 包含所有图表和详细统计

**使用示例**：

```bash
# 生成图表（使用日志统计）
log-analyzer charts app.log

# 指定输出目录
log-analyzer charts app.log -o ./reports

# 指定输出格式
log-analyzer charts app.log -f html
```

**输出内容**：
- `log-trend.html` - 日志趋势图
- `log-levels.html` - 日志级别分布图
- `error-types.html` - 错误类型分布图
- `log-analysis-report.html` - 交互式报告

**图表功能**：
- 📊 **日志趋势图**
  - 显示 INFO、DEBUG、WARN、ERROR 数量随时间的变化
  - 支持 SVG 图形渲染
  - 响应式设计

- 📊 **日志级别分布图**
  - 显示各级别的占比
  - 饼图可视化
  - 点击显示详情

- 📊 **错误类型分布图**
  - 显示数据库、网络、内存、文件系统等错误类型的数量
  - 柱状图可视化
  - 支持多维度分类

- 📊 **交互式报告**
  - 汇总所有统计数据
  - 链接到所有图表
  - 快速导航和过滤

**技术特性**：
- 使用纯 JavaScript 生成 SVG 图形
- 使用 HTML/CSS 生成美观的报告
- 支持导出到本地文件
- 支持多种图表类型

**应用场景**：
- **开发环境**：实时查看日志趋势，快速发现问题
- **生产环境**：定期生成报告，监控系统健康状况
- **问题诊断**：通过可视化快速定位问题
- **团队协作**：共享可视化报告，便于团队讨论

**示例输出**：
- 总日志数
- 各级别数量和占比
- 错误类型分布
- 趋势图表
- 交互式报告

## 适用场景

- 快速定位系统错误
- 分析日志异常趋势
- 聚合分析多个服务的日志
- DevOps 运维监控
- 自动日志归档和备份

## 项目地址

- **GitHub**: https://github.com/RaphaelLcs-financial/log-analyzer
- **npm**: https://www.npmjs.com/package/@raphaellcs/log-analyzer

## 开源和贡献

所有工具都是开源的，欢迎提交 Issue 和 PR！

- **GitHub**: https://github.com/RaphaelLcs-financial
- **npm**: https://www.npmjs.com/~raphaellcs

如果你觉得这个工具对你有帮助，请给个 Star ⭐️，或者考虑[赞助我](https://github.com/sponsors/RaphaelLcs-financial)！

---

**作者**: 梦心
**GitHub**: https://github.com/RaphaelLcs-financial
**npm**: https://www.npmjs.com/~raphaellcs
