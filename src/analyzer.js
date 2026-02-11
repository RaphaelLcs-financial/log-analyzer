// 日志分析核心模块

const moment = require('moment');

// 日志级别
const LOG_LEVELS = {
  ERROR: { level: 1, color: 'red' },
  WARN: { level: 2, color: 'yellow' },
  WARNING: { level: 2, color: 'yellow' },
  INFO: { level: 3, color: 'cyan' },
  DEBUG: { level: 4, color: 'gray' }
};

// 解析日志行
function parseLogLine(line) {
  // 尝试匹配常见格式
  const patterns = [
    // 标准格式：[2024-02-11 18:00:00] [INFO] message
    /^\[(\d{4}-\d{2}-\d{2}[^\]]+)\]\s+\[([A-Z]+)\]\s+(.+)/,
    // nginx 格式：2024/02/11 18:00:00 [info] message
    /^(\d{4}\/\d{2}\/\d{2}[^\s]+)\s+\[([a-z]+)\]\s+(.+)/i,
    // syslog 格式：Feb 11 18:00:00 hostname message
    /^([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+)/,
    // 简单格式：ERROR: message
    /^(ERROR|WARN|INFO|DEBUG):\s*(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        timestamp: match[1],
        level: match[2]?.toUpperCase(),
        message: match[3] || match[2] || line
      };
    }
  }
  
  // 无法解析，返回原始行
  return {
    timestamp: null,
    level: null,
    message: line.trim()
  };
}

// 获取日志级别权重
function getLevelWeight(level) {
  if (!level) return 0;
  const normalized = level.toUpperCase();
  for (const [key, value] of Object.entries(LOG_LEVELS)) {
    if (normalized === key || normalized.startsWith(key)) {
      return value.level;
    }
  }
  return 0;
}

// 分析日志
function analyzeLogs(content, options) {
  const lines = content.split('\n');
  const stats = {
    totalLines: 0,
    levels: {},
    errors: [],
    warnings: [],
    patterns: {},
    timeRange: null
  };
  
  const timestamps = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    stats.totalLines++;
    const parsed = parseLogLine(line);
    
    // 统计级别
    if (parsed.level) {
      const normalizedLevel = parsed.level.toUpperCase();
      stats.levels[normalizedLevel] = (stats.levels[normalizedLevel] || 0) + 1;
      
      // 收集错误和警告
      if (normalizedLevel.startsWith('ERROR')) {
        stats.errors.push({
          line: stats.totalLines,
          timestamp: parsed.timestamp,
          message: parsed.message
        });
      } else if (normalizedLevel.startsWith('WARN')) {
        stats.warnings.push({
          line: stats.totalLines,
          timestamp: parsed.timestamp,
          message: parsed.message
        });
      }
    }
    
    // 收集时间戳
    if (parsed.timestamp) {
      const parsedTime = moment(parsed.timestamp);
      if (parsedTime.isValid()) {
        timestamps.push(parsedTime);
      }
    }
    
    // 模式匹配
    if (options.patterns) {
      for (const pattern of options.patterns) {
        if (line.includes(pattern)) {
          stats.patterns[pattern] = (stats.patterns[pattern] || 0) + 1;
        }
      }
    }
  }
  
  // 计算时间范围
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a - b);
    stats.timeRange = {
      start: timestamps[0].toISOString(),
      end: timestamps[timestamps.length - 1].toISOString(),
      duration: timestamps[timestamps.length - 1] - timestamps[0]
    };
  }
  
  return stats;
}

module.exports = {
  LOG_LEVELS,
  parseLogLine,
  getLevelWeight,
  analyzeLogs
};
