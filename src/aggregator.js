// 多日志文件聚合模块

const fs = require('fs');
const path = require('path');
const { analyzeLogs } = require('./analyzer.js');

/**
 * 聚合多个日志文件
 * @param {Array<string>} filePaths - 日志文件路径列表
 * @param {Object} options - 分析选项
 * @returns {Object} 聚合结果
 */
function aggregateLogs(filePaths, options = {}) {
  const results = [];

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = analyzeLogs(content, options);

    results.push({
      file: filePath,
      size: fs.statSync(filePath).size,
      ...stats
    });
  }

  // 聚合统计
  const aggregated = {
    files: results.length,
    totalLines: results.reduce((sum, r) => sum + r.totalLines, 0),
    totalSize: results.reduce((sum, r) => sum + r.size, 0),
    levels: {},
    errors: [],
    warnings: [],
    patterns: {},
    timeRange: null,
    files: results
  };

  // 聚合级别统计
  for (const result of results) {
    for (const [level, count] of Object.entries(result.levels || {})) {
      aggregated.levels[level] = (aggregated.levels[level] || 0) + count;
    }
  }

  // 聚合错误
  for (const result of results) {
    for (const error of result.errors || []) {
      aggregated.errors.push({
        ...error,
        source: result.file
      });
    }
  }

  // 聚合警告
  for (const result of results) {
    for (const warning of result.warnings || []) {
      aggregated.warnings.push({
        ...warning,
        source: result.file
      });
    }
  }

  // 聚合模式匹配
  for (const result of results) {
    for (const [pattern, count] of Object.entries(result.patterns || {})) {
      aggregated.patterns[pattern] = (aggregated.patterns[pattern] || 0) + count;
    }
  }

  // 计算时间范围
  const allTimestamps = [];
  for (const result of results) {
    if (result.timeRange) {
      allTimestamps.push(new Date(result.timeRange.start).getTime());
      allTimestamps.push(new Date(result.timeRange.end).getTime());
    }
  }

  if (allTimestamps.length > 0) {
    const start = Math.min(...allTimestamps);
    const end = Math.max(...allTimestamps);
    aggregated.timeRange = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      duration: end - start
    };
  }

  return aggregated;
}

/**
 * 扫描目录中的日志文件
 * @param {string} dirPath - 目录路径
 * @param {Object} options - 扫描选项
 * @returns {Array<string>} 日志文件路径列表
 */
function scanLogFiles(dirPath, options = {}) {
  const {
    extensions = ['.log', '.txt'],
    recursive = true,
    exclude = []
  } = options;

  const files = [];

  const scan = (currentPath) => {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && recursive) {
        // 检查是否在排除列表中
        const relativePath = path.relative(dirPath, itemPath);
        const isExcluded = exclude.some(pattern => {
          if (pattern.startsWith('*')) {
            return item.match(pattern.slice(1));
          }
          return relativePath.includes(pattern);
        });

        if (!isExcluded) {
          scan(itemPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(itemPath);
        }
      }
    }
  };

  try {
    scan(dirPath);
  } catch (e) {
    console.error(`扫描目录失败: ${e.message}`);
  }

  return files.sort();
}

/**
 * 通配符匹配文件路径
 * @param {string} pattern - 通配符模式，例如支持 .log 扩展名匹配
 * @returns {Array<string>} 匹配的文件路径列表
 */
function globFiles(pattern) {
  const { Minimatch } = require('minimatch');
  const minimatch = new Minimatch(pattern, { matchBase: true });

  // 解析目录
  const dirPath = minimatch.globSet
    .map(s => s.split('/').slice(0, -1).join('/') || '.')
    .reduce((prev, curr) => {
      // 选择共同的父目录
      const prevParts = prev.split('/');
      const currParts = curr.split('/');
      const common = [];
      for (let i = 0; i < Math.min(prevParts.length, currParts.length); i++) {
        if (prevParts[i] === currParts[i]) {
          common.push(prevParts[i]);
        } else {
          break;
        }
      }
      return common.join('/') || '.';
    }, '.');

  // 扫描目录
  const files = [];
  const scan = (currentPath) => {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scan(itemPath);
        } else if (stat.isFile()) {
          // 检查是否匹配模式
          const relativePath = path.relative(dirPath, itemPath);
          if (minimatch.match(relativePath)) {
            files.push(itemPath);
          }
        }
      }
    } catch (e) {
      // 忽略无法访问的目录
    }
  };

  scan(dirPath);
  return files.sort();
}

module.exports = {
  aggregateLogs,
  scanLogFiles,
  globFiles
};
