// 异常检测模块

/**
 * 检测错误突然增加
 * @param {Array} errors - 错误列表
 * @param {number} threshold - 阈值（错误数量/分钟）
 * @param {number} windowMinutes - 时间窗口（分钟）
 * @returns {Array} 异常列表
 */
function detectErrorSpikes(errors, threshold = 5, windowMinutes = 1) {
  if (errors.length < threshold) return [];

  const anomalies = [];
  const windowMs = windowMinutes * 60 * 1000;

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (!error.timestamp) continue;

    const errorTime = new Date(error.timestamp).getTime();

    // 计算时间窗口内的错误数量
    let count = 0;
    for (let j = i; j < errors.length; j++) {
      if (!errors[j].timestamp) continue;
      const nextErrorTime = new Date(errors[j].timestamp).getTime();
      if (nextErrorTime - errorTime <= windowMs) {
        count++;
      } else {
        break;
      }
    }

    if (count >= threshold) {
      anomalies.push({
        type: 'ERROR_SPIKE',
        severity: 'HIGH',
        timestamp: error.timestamp,
        message: `检测到错误突增：${windowMinutes}分钟内 ${count} 个错误`,
        affectedLines: errors.slice(i, i + count).map(e => e.line)
      });

      // 跳过已检查的错误
      i += count - 1;
    }
  }

  return anomalies;
}

/**
 * 检测重复错误
 * @param {Array} errors - 错误列表
 * @param {number} threshold - 重复次数阈值
 * @returns {Array} 重复错误列表
 */
function detectRepeatedErrors(errors, threshold = 3) {
  const messageGroups = {};

  // 按消息分组
  for (const error of errors) {
    const key = error.message.trim().toLowerCase();
    if (!messageGroups[key]) {
      messageGroups[key] = [];
    }
    messageGroups[key].push(error);
  }

  const anomalies = [];

  // 找出重复次数超过阈值的错误
  for (const [message, group] of Object.entries(messageGroups)) {
    if (group.length >= threshold) {
      anomalies.push({
        type: 'REPEATED_ERROR',
        severity: group.length > threshold * 2 ? 'HIGH' : 'MEDIUM',
        message: message,
        count: group.length,
        firstOccurrence: group[0].timestamp,
        lastOccurrence: group[group.length - 1].timestamp,
        affectedLines: group.map(e => e.line)
      });
    }
  }

  return anomalies;
}

/**
 * 检测日志级别变化
 * @param {Object} logsWithTimestamp - 带时间戳的日志列表
 * @returns {Array} 趋势变化
 */
function detectLevelTrends(logsWithTimestamp) {
  if (logsWithTimestamp.length === 0) return [];

  // 按时间排序
  const sortedLogs = [...logsWithTimestamp].filter(l => l.timestamp).sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  if (sortedLogs.length < 10) return [];

  // 将日志分为前后两半
  const midPoint = Math.floor(sortedLogs.length / 2);
  const firstHalf = sortedLogs.slice(0, midPoint);
  const secondHalf = sortedLogs.slice(midPoint);

  // 统计每个级别的数量
  const countLevels = (logs) => {
    const counts = {};
    for (const log of logs) {
      if (log.level) {
        counts[log.level] = (counts[log.level] || 0) + 1;
      }
    }
    return counts;
  };

  const firstLevels = countLevels(firstHalf);
  const secondLevels = countLevels(secondHalf);

  const trends = [];

  // 比较错误和警告的变化
  const firstErrors = firstLevels.ERROR || 0;
  const secondErrors = secondLevels.ERROR || 0;
  const errorChange = ((secondErrors - firstErrors) / (firstErrors || 1)) * 100;

  if (Math.abs(errorChange) > 50) {
    trends.push({
      type: 'ERROR_TREND',
      direction: errorChange > 0 ? 'INCREASING' : 'DECREASING',
      changePercent: Math.abs(errorChange).toFixed(2),
      firstHalf: firstErrors,
      secondHalf: secondErrors,
      message: errorChange > 0
        ? `错误率上升 ${errorChange.toFixed(2)}%`
        : `错误率下降 ${Math.abs(errorChange).toFixed(2)}%`
    });
  }

  const firstWarns = firstLevels.WARN || 0;
  const secondWarns = secondLevels.WARN || 0;
  const warnChange = ((secondWarns - firstWarns) / (firstWarns || 1)) * 100;

  if (Math.abs(warnChange) > 50) {
    trends.push({
      type: 'WARN_TREND',
      direction: warnChange > 0 ? 'INCREASING' : 'DECREASING',
      changePercent: Math.abs(warnChange).toFixed(2),
      firstHalf: firstWarns,
      secondHalf: secondWarns,
      message: warnChange > 0
        ? `警告率上升 ${warnChange.toFixed(2)}%`
        : `警告率下降 ${Math.abs(warnChange).toFixed(2)}%`
    });
  }

  return trends;
}

/**
 * 自动分类错误
 * @param {Array} errors - 错误列表
 * @returns {Object} 分类结果
 */
function classifyErrors(errors) {
  const categories = {
    DATABASE: {
      keywords: ['database', 'db', 'sql', 'query', 'connection', 'timeout', 'mysql', 'postgres', 'mongodb'],
      errors: []
    },
    NETWORK: {
      keywords: ['network', 'socket', 'connection', 'timeout', 'dns', 'http', 'request', 'api'],
      errors: []
    },
    AUTHENTICATION: {
      keywords: ['auth', 'login', 'token', 'permission', 'denied', 'forbidden', 'unauthorized'],
      errors: []
    },
    FILE_SYSTEM: {
      keywords: ['file', 'directory', 'path', 'not found', 'permission', 'disk', 'storage'],
      errors: []
    },
    MEMORY: {
      keywords: ['memory', 'heap', 'out of memory', 'oom', 'allocation'],
      errors: []
    },
    VALIDATION: {
      keywords: ['validation', 'invalid', 'format', 'type', 'schema', 'required'],
      errors: []
    },
    OTHER: {
      keywords: [],
      errors: []
    }
  };

  for (const error of errors) {
    const message = error.message.toLowerCase();
    let classified = false;

    for (const [category, data] of Object.entries(categories)) {
      if (category === 'OTHER') continue;

      for (const keyword of data.keywords) {
        if (message.includes(keyword)) {
          data.errors.push(error);
          classified = true;
          break;
        }
      }

      if (classified) break;
    }

    if (!classified) {
      categories.OTHER.errors.push(error);
    }
  }

  return categories;
}

/**
 * 综合异常检测
 * @param {Object} stats - 统计结果
 * @param {Object} options - 检测选项
 * @returns {Object} 异常检测结果
 */
function detectAnomalies(stats, options = {}) {
  const {
    errorSpikeThreshold = 5,
    errorSpikeWindowMinutes = 1,
    repeatThreshold = 3
  } = options;

  const result = {
    anomalies: [],
    trends: [],
    classification: null
  };

  // 检测错误突增
  if (stats.errors && stats.errors.length > 0) {
    const spikes = detectErrorSpikes(
      stats.errors,
      errorSpikeThreshold,
      errorSpikeWindowMinutes
    );
    result.anomalies.push(...spikes);

    // 检测重复错误
    const repeats = detectRepeatedErrors(stats.errors, repeatThreshold);
    result.anomalies.push(...repeats);

    // 分类错误
    result.classification = classifyErrors(stats.errors);
  }

  // 检测趋势变化（需要带时间戳的日志）
  // 注意：这里需要从原始日志数据中提取带时间戳的日志
  // 暂时跳过，因为 stats 结构中缺少完整的日志数据

  return result;
}

module.exports = {
  detectErrorSpikes,
  detectRepeatedErrors,
  detectLevelTrends,
  classifyErrors,
  detectAnomalies
};
