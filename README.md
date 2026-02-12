# log-analyzer

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
