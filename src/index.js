#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
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
    /^\[?(\d{4}-\d{2}-\d{2}[^]\s]*)[\s\]]+\[?([A-Z]+)[\]\s]+(.+)/,
    // nginx 格式：2024/02/11 18:00:00 [info] message
    /^(\d{4}\/\d{2}\/\d{2}[^]\s]*)\s+\[?([a-z]+)[\]\s]+(.+)/i,
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

// 打印统计结果
function printStats(stats, options) {
  console.log(chalk.cyan('\n📊 日志统计\n'));
  
  // 总行数
  console.log(chalk.gray(`总行数: ${stats.totalLines}`));
  
  // 时间范围
  if (stats.timeRange) {
    const durationMs = stats.timeRange.duration;
    const duration = moment.duration(durationMs);
    console.log(chalk.gray(`时间范围: ${stats.timeRange.start} ~ ${stats.timeRange.end}`));
    console.log(chalk.gray(`持续时间: ${duration.humanize()}`));
  }
  
  console.log();
  
  // 级别统计
  if (Object.keys(stats.levels).length > 0) {
    console.log(chalk.cyan('日志级别:'));
    for (const [level, count] of Object.entries(stats.levels).sort((a, b) => b[1] - a[1])) {
      const levelInfo = LOG_LEVELS[level];
      const color = levelInfo ? levelInfo.color : 'gray';
      console.log(`  ${chalk[color](level.padEnd(10))} ${count} 次`);
    }
    console.log();
  }
  
  // 错误
  if (stats.errors.length > 0) {
    console.log(chalk.red(`❌ 错误 (${stats.errors.length}):`));
    const displayErrors = options.limit ? stats.errors.slice(0, options.limit) : stats.errors;
    for (const error of displayErrors) {
      console.log(chalk.red(`  [${error.line}] ${error.message}`));
    }
    if (options.limit && stats.errors.length > options.limit) {
      console.log(chalk.gray(`  ... 还有 ${stats.errors.length - options.limit} 个错误`));
    }
    console.log();
  }
  
  // 警告
  if (stats.warnings.length > 0) {
    console.log(chalk.yellow(`⚠️  警告 (${stats.warnings.length}):`));
    const displayWarnings = options.limit ? stats.warnings.slice(0, options.limit) : stats.warnings;
    for (const warning of displayWarnings) {
      console.log(chalk.yellow(`  [${warning.line}] ${warning.message}`));
    }
    if (options.limit && stats.warnings.length > options.limit) {
      console.log(chalk.gray(`  ... 还有 ${stats.warnings.length - options.limit} 个警告`));
    }
    console.log();
  }
  
  // 模式匹配
  if (Object.keys(stats.patterns).length > 0) {
    console.log(chalk.cyan('🔍 模式匹配:'));
    for (const [pattern, count] of Object.entries(stats.patterns)) {
      console.log(chalk.gray(`  "${pattern}": ${count} 次`));
    }
    console.log();
  }
}

// 搜索日志
function searchLogs(content, query, options) {
  const lines = content.split('\n');
  const results = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(query.toLowerCase())) {
      const parsed = parseLogLine(line);
      results.push({
        lineNumber: i + 1,
        timestamp: parsed.timestamp,
        level: parsed.level,
        message: parsed.message
      });
    }
  }
  
  return results;
}

// 打印搜索结果
function printSearchResults(results, options) {
  console.log(chalk.cyan(`\n🔍 搜索结果: "${query}" (${results.length} 条)\n`));
  
  const displayResults = options.limit ? results.slice(0, options.limit) : results;
  
  for (const result of displayResults) {
    const levelColor = LOG_LEVELS[result.level]?.color || 'gray';
    console.log(chalk.gray(`[${result.lineNumber}]`), 
                chalk.gray(result.timestamp || '-'),
                result.level ? chalk[levelColor](result.level) : '',
                result.message);
  }
  
  if (options.limit && results.length > options.limit) {
    console.log(chalk.gray(`\n... 还有 ${results.length - options.limit} 条结果`));
  }
  
  console.log();
}

// 实时监控日志
function watchLog(filePath, options) {
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`文件不存在: ${filePath}`));
    process.exit(1);
  }
  
  const fs = require('fs');
  let fileSize = fs.statSync(filePath).size;
  
  console.log(chalk.cyan(`\n👀 监控日志: ${filePath}`));
  console.log(chalk.gray('按 Ctrl+C 停止\n'));
  
  const checkInterval = setInterval(() => {
    try {
      const currentSize = fs.statSync(filePath).size;
      
      if (currentSize > fileSize) {
        const stream = fs.createReadStream(filePath, {
          start: fileSize,
          encoding: 'utf8'
        });
        
        stream.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            
            const parsed = parseLogLine(line);
            
            // 过滤级别
            if (options.level) {
              const weight = getLevelWeight(parsed.level);
              const minWeight = getLevelWeight(options.level);
              if (weight < minWeight) continue;
            }
            
            // 打印
            const levelColor = LOG_LEVELS[parsed.level]?.color || 'gray';
            console.log(chalk.gray(parsed.timestamp || '-'), 
                       parsed.level ? chalk[levelColor](parsed.level) : '',
                       parsed.message);
          }
        });
        
        fileSize = currentSize;
      }
    } catch (e) {
      console.error(chalk.red(`监控错误: ${e.message}`));
    }
  }, options.interval || 1000);
  
  process.on('SIGINT', () => {
    clearInterval(checkInterval);
    console.log(chalk.gray('\n\n停止监控'));
    process.exit(0);
  });
}

// CLI 配置
program
  .name('log-analyzer')
  .description('日志分析工具 - 快速分析日志文件')
  .version('1.0.0');

// 导出为 JSON
function exportJSON(stats, outputPath) {
  const data = JSON.stringify(stats, null, 2);
  
  if (outputPath) {
    fs.writeFileSync(outputPath, data, 'utf-8');
    console.log(chalk.green(`✓ 已导出到: ${outputPath}`));
  } else {
    console.log(data);
  }
}

// 导出为 CSV
function exportCSV(stats, outputPath) {
  const lines = [];
  
  // 头部
  lines.push('Type,Count');
  
  // 级别统计
  for (const [level, count] of Object.entries(stats.levels)) {
    lines.push(`Level_${level},${count}`);
  }
  
  // 错误
  lines.push('\nType,Line,Timestamp,Message');
  for (const error of stats.errors) {
    const timestamp = error.timestamp || '';
    const message = `"${error.message.replace(/"/g, '""')}"`;
    lines.push(`ERROR,${error.line},${timestamp},${message}`);
  }
  
  // 警告
  for (const warning of stats.warnings) {
    const timestamp = warning.timestamp || '';
    const message = `"${warning.message.replace(/"/g, '""')}"`;
    lines.push(`WARNING,${warning.line},${timestamp},${message}`);
  }
  
  // 模式统计
  if (Object.keys(stats.patterns).length > 0) {
    lines.push('\nPattern,Count');
    for (const [pattern, count] of Object.entries(stats.patterns)) {
      lines.push(`"${pattern}",${count}`);
    }
  }
  
  const csv = lines.join('\n');
  
  if (outputPath) {
    fs.writeFileSync(outputPath, csv, 'utf-8');
    console.log(chalk.green(`✓ 已导出到: ${outputPath}`));
  } else {
    console.log(csv);
  }
}

// 导出分析结果
function exportStats(stats, format, outputPath) {
  switch (format.toLowerCase()) {
    case 'json':
      exportJSON(stats, outputPath);
      break;
    case 'csv':
      exportCSV(stats, outputPath);
      break;
    default:
      console.log(chalk.red(`不支持的导出格式: ${format}`));
      console.log(chalk.gray('支持的格式: json, csv'));
      process.exit(1);
  }
}

program
  .command('analyze <file>')
  .option('-p, --patterns <items>', '搜索模式（逗号分隔）')
  .option('-l, --limit <number>', '限制显示数量', parseInt)
  .option('-o, --output <file>', '导出结果到文件')
  .option('-f, --format <type>', '导出格式（json/csv）', 'json')
  .description('分析日志文件')
  .action((file, options) => {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`文件不存在: ${file}`));
      process.exit(1);
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    
    let patterns = [];
    if (options.patterns) {
      patterns = options.patterns.split(',');
    }
    
    const stats = analyzeLogs(content, {
      patterns
    });
    
    // 如果指定了导出，则导出
    if (options.output) {
      exportStats(stats, options.format, options.output);
    } else {
      printStats(stats, options);
    }
  });

program
  .command('search <file> <query>')
  .option('-l, --limit <number>', '限制显示数量', parseInt)
  .description('搜索日志')
  .action((file, query, options) => {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`文件不存在: ${file}`));
      process.exit(1);
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    const results = searchLogs(content, query, options);
    printSearchResults(results, options);
  });

program
  .command('watch <file>')
  .option('-i, --interval <ms>', '检查间隔（毫秒）', parseInt)
  .option('-L, --level <level>', '最低日志级别（ERROR/WARN/INFO/DEBUG）')
  .description('实时监控日志')
  .action((file, options) => {
    watchLog(file, options);
  });

program.parse();
