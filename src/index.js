#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { archiveLogFiles, archiveDirectory, showArchiveStats } = require('./archive');
const moment = require('moment');
const { LOG_LEVELS, parseLogLine, getLevelWeight, analyzeLogs } = require('./analyzer.js');
const { detectAnomalies } = require('./anomaly-detection.js');
const { aggregateLogs, scanLogFiles, globFiles } = require('./aggregator.js');

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

  console.log(chalk.cyan(`\n👀 监控日志: ${filePath}\n`));
  console.log(chalk.gray('按 Ctrl+C 停止\n'));

  const checkInterval = setInterval(() => {
    try {
      const currentSize = fs.statSync(filePath).size;

      if (currentSize > fileSize) {
        const stream = fs.createReadStream(filePath, {
          start: fileSize,
          encoding: 'utf8'
        });

        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk;

          const lines = buffer.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;

            const parsed = parseLogLine(line);

            // 过滤级别
            if (options.level && parsed.level) {
              const levelWeight = getLevelWeight(parsed.level);
              const minWeight = options.level.map(l => getLevelWeight(l)).reduce((a, b) => Math.min(a, b), Infinity);
              
              if (levelWeight < minWeight) {
                continue;
              }
            }

            const levelColor = LOG_LEVELS[parsed.level]?.color || 'gray';
            console.log(chalk.gray(`[${parsed.lineNumber}]`),
                        chalk.gray(parsed.timestamp || '-'),
                        parsed.level ? chalk[levelColor](parsed.level) : '',
                        parsed.message);
          }
        });

        fileSize = currentSize;
      }
    } catch (error) {
      console.error(error);
    }
  }, options.interval || 5000);

  // 清理
  process.on('SIGINT', () => {
    clearInterval(checkInterval);
    console.log(chalk.gray('\n监控已停止'));
    process.exit(0);
  });
}

// 导出统计结果为 CSV
function exportStatsCSV(stats, outputPath) {
  const sections = [];

  // 级别统计
  sections.push(['Metric', 'Value']);
  sections.push(['TotalFiles', stats.files.length.toString()]);
  sections.push(['TotalLines', stats.totalLines.toString()]);
  sections.push(['TotalSize (KB)', (stats.totalSize / 1024).toFixed(2)]);
  sections.push([]);

  sections.push(['Level', 'Count']);
  for (const [level, count] of Object.entries(stats.levels)) {
    sections.push([level, count.toString()]);
  }
  sections.push([]);

  // 时间范围
  if (stats.timeRange) {
    sections.push(['TimeRange', 'Value']);
    sections.push(['Start', stats.timeRange.start]);
    sections.push(['End', stats.timeRange.end]);
    sections.push(['Duration (ms)', stats.timeRange.duration.toString()]);
    sections.push([]);
  }

  const csv = sections.map(section => section.join(',')).join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, csv, 'utf-8');
    console.log(chalk.green(`✓ 已导出到: ${outputPath}`));
  } else {
    console.log(csv);
  }
}

// 导出分析结果为 CSV
function exportStatsJSON(stats, outputPath) {
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2), 'utf-8');
    console.log(chalk.green(`✓ 已导出到: ${outputPath}`));
  } else {
    console.log(JSON.stringify(stats, null, 2));
  }
}

// 导出分析结果
function exportStats(stats, format, outputPath) {
  switch (format.toLowerCase()) {
    case 'json':
      exportStatsJSON(stats, outputPath);
      break;
    case 'csv':
      exportStatsCSV(stats, outputPath);
      break;
    default:
      console.log(chalk.red(`不支持的导出格式: ${format}`));
      console.log(chalk.gray('支持的格式: json, csv'));
      process.exit(1);
  }
}

program
  .name('log-analyzer')
  .description('日志分析工具 - 快速分析日志文件，提取关键信息')
  .version('2.0.0');

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

program
  .command('detect <file>')
  .option('--error-spike-threshold <number>', '错误突增阈值（错误数量/分钟）', parseInt)
  .option('--error-spike-window <minutes>', '时间窗口（分钟）', parseInt)
  .option('--repeat-threshold <number>', '重复错误次数阈值', parseInt)
  .option('--trend-window <ms>', '趋势分析时间窗口（毫秒）', parseInt)
  .option('--output <file>', '导出结果到文件（JSON格式）')
  .description('检测日志异常')
  .action((file, options) => {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`文件不存在: ${file}`));
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');

    const anomalies = detectAnomalies(content, {
      errorSpikeThreshold: options.errorSpikeThreshold || 5,
      errorSpikeWindow: (options.errorSpikeWindow || 5) * 60 * 1000,
      repeatThreshold: options.repeatThreshold || 3,
      trendWindow: options.trendWindow || 300 * 1000
    });

    console.log(chalk.cyan('\n🔍 异常检测结果\n'));
    console.log(chalk.gray(`总异常数: ${anomalies.length}\n`));

    for (const anomaly of anomalies) {
      const typeColor = anomaly.type === 'ERROR_SPIKE' ? 'red' :
                       anomaly.type === 'REPEATED_ERROR' ? 'yellow' :
                       anomaly.type === 'TREND_CHANGE' ? 'blue' : 'gray';

      console.log(chalk[typeColor](`[${anomaly.type}]`));
      console.log(chalk.gray(`  描述: ${anomaly.description}`));
      console.log(chalk.gray(`  位置: 第 ${anomaly.lineNumber} 行`));
      console.log(chalk.gray(`  时间: ${anomaly.timestamp}`));
      console.log();
    }

    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(anomalies, null, 2), 'utf-8');
      console.log(chalk.green(`✓ 异常结果已导出到: ${options.output}`));
    }
  });

program
  .command('aggregate <files...>')
  .option('-d, --directory <path>', '扫描目录中的日志文件')
  .option('-p, --pattern <glob>', '使用通配符模式匹配文件')
  .option('--exclude <items>', '排除的目录（逗号分隔）')
  .option('-o, --output <file>', '导出结果到文件（JSON格式）')
  .option('-f, --format <type>', '导出格式（json/csv）', 'json')
  .description('聚合分析多个日志文件')
  .action((files, options) => {
    let filePaths = [];

    if (options.directory) {
      const exclude = options.exclude ? options.exclude.split(',') : [];
      filePaths = scanLogFiles(options.directory, {
        extensions: ['.log', '.txt'],
        recursive: true,
        exclude
      });
    } else if (options.pattern) {
      filePaths = globFiles(options.pattern);
    } else {
      filePaths = files;
    }

    if (filePaths.length === 0) {
      console.log(chalk.red('未找到日志文件'));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📊 聚合分析 ${filePaths.length} 个文件\n`));

    const aggregated = aggregateLogs(filePaths, {});

    // 打印结果
    console.log(chalk.gray(`总行数: ${aggregated.totalLines}`));
    console.log(chalk.gray(`总大小: ${(aggregated.totalSize / 1024).toFixed(2)} KB`));

    if (aggregated.timeRange) {
      const duration = moment.duration(aggregated.timeRange.duration);
      console.log(chalk.gray(`时间范围: ${aggregated.timeRange.start} ~ ${aggregated.timeRange.end}`));
      console.log(chalk.gray(`持续时间: ${duration.humanize()}`));
    }

    console.log();

    // 级别统计
    if (Object.keys(aggregated.levels).length > 0) {
      console.log(chalk.cyan('日志级别:'));
      for (const [level, count] of Object.entries(aggregated.levels).sort((a, b) => b[1] - a[1])) {
        const levelInfo = LOG_LEVELS[level];
        const color = levelInfo ? levelInfo.color : 'gray';
        console.log(`  ${chalk[color](level.padEnd(10))} ${count} 次`);
      }
      console.log();
    }

    // 错误
    if (aggregated.errors.length > 0) {
      console.log(chalk.red(`❌ 错误 (${aggregated.errors.length}):`));
      for (let i = 0; i < Math.min(10, aggregated.errors.length); i++) {
        const error = aggregated.errors[i];
        const fileName = error.source ? path.basename(error.source) : '';
        console.log(chalk.red(`  [${error.line}] ${fileName}: ${error.message}`));
      }
      if (aggregated.errors.length > 10) {
        console.log(chalk.gray(`  ... 还有 ${aggregated.errors.length - 10} 个错误`));
      }
      console.log();
    }

    // 警告
    if (aggregated.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️  警告 (${aggregated.warnings.length}):`));
      for (let i = 0; i < Math.min(10, aggregated.warnings.length); i++) {
        const warning = aggregated.warnings[i];
        const fileName = warning.source ? path.basename(warning.source) : '';
        console.log(chalk.yellow(`  [${warning.line}] ${fileName}: ${warning.message}`));
      }
      if (aggregated.warnings.length > 10) {
        console.log(chalk.gray(`  ... 还有 ${aggregated.warnings.length - 10} 个警告`));
      }
      console.log();
    }

    // 文件列表
    console.log(chalk.cyan('📁 文件列表:'));
    for (const file of aggregated.files) {
      const fileName = path.basename(file.file);
      console.log(chalk.gray(`  ${fileName}: ${file.totalLines} 行, ${(file.size / 1024).toFixed(2)} KB`));
    }

    console.log();

    // 导出结果
    if (options.output) {
      const outputPath = options.output;
      if (options.format === 'json') {
        fs.writeFileSync(outputPath, JSON.stringify(aggregated, null, 2), 'utf-8');
      } else if (options.format === 'csv') {
        // 简化版 CSV 导出
        const sections = [];
        sections.push(['Metric', 'Value']);
        sections.push(['TotalFiles', aggregated.files.length.toString()]);
        sections.push(['TotalLines', aggregated.totalLines.toString()]);
        sections.push(['TotalSize (KB)', (aggregated.totalSize / 1024).toFixed(2)]);
        sections.push([]);
        sections.push(['Level', 'Count']);
        for (const [level, count] of Object.entries(aggregated.levels)) {
          sections.push([level, count.toString()]);
        }

        const csv = sections.map(section => section.join(',')).join('\n');
        fs.writeFileSync(outputPath, csv, 'utf-8');
      }
      console.log(chalk.green(`✓ 已导出到: ${outputPath}`));
    }
  });

// 归档日志命令
program
  .command('archive <file>')
  .option('-d, --archive-dir <path>', '归档目录', './archive')
  .option('--compress', '压缩归档文件（使用 gzip）', false)
  .option('--delete-after <days>', '归档 X 天后的文件', 0)
  .option('--dry-run', '预览模式（不真正归档）', false)
  .description('归档日志文件')
  .action((file, options) => {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`文件不存在: ${file}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📦 归档日志: ${file}\n`));

    archiveLogFiles([file], {
      archiveDir: options.archiveDir,
      compress: options.compress,
      deleteAfter: options.deleteAfter,
      dryRun: options.dryRun
    });

    console.log();
  });

// 归档目录命令
program
  .command('archive-dir <dir>')
  .option('-d, --archive-dir <path>', '归档目录', './archive')
  .option('--compress', '压缩归档文件（使用 gzip）', false)
  .option('--delete-after <days>', '归档 X 天后的文件', 0)
  .option('--dry-run', '预览模式（不真正归档）', false)
  .description('归档目录中的所有日志文件')
  .action((dir, options) => {
    if (!fs.existsSync(dir)) {
      console.log(chalk.red(`目录不存在: ${dir}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📂 归档目录: ${dir}\n`));

    archiveDirectory(dir, {
      archiveDir: options.archiveDir,
      compress: options.compress,
      deleteAfter: options.deleteAfter,
      dryRun: options.dryRun
    });

    console.log();
  });

// 归档统计命令
program
  .command('archive-stats')
  .option('-d, --archive-dir <path>', '归档目录', './archive')
  .description('显示归档统计')
  .action((options) => {
    const archiveDir = options.archiveDir;

    console.log(chalk.cyan(`\n📊 归档统计\n`));
    console.log(chalk.gray(`归档目录: ${archiveDir}\n`));

    showArchiveStats(archiveDir);
  });

program.parse();
