const fs = require('fs');
const path = require('path');
const { archiveLogFiles } = require('./archive');

console.log('开始测试归档功能...\n');

// 创建测试日志文件
const testDir = '/tmp/log-analyzer-test';
const logFile1 = path.join(testDir, 'app.log');
const logFile2 = path.join(testDir, 'api.log');
const logFile3 = path.join(testDir, 'error.log');

// 创建测试目录
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// 写入测试日志
const logContent1 = Array(100).fill(0).map((_, i) =>
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] INFO App started - Request ${i}\n`
).join('\n');

const logContent2 = Array(100).fill(0).map((_, i) =>
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] INFO API endpoint /users called - Request ${i}\n`
).join('\n');

const logContent3 = Array(10).fill(0).map((_, i) =>
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] ERROR Database connection failed - Attempt ${i}\n`
).join('\n');

fs.writeFileSync(logFile1, logContent1, 'utf-8');
fs.writeFileSync(logFile2, logContent2, 'utf-8');
fs.writeFileSync(logFile3, logContent3, 'utf-8');

console.log('创建测试日志文件完成\n');

// 测试归档
console.log('测试 1: 归档单个文件（不压缩）');
archiveLogFiles([logFile1], {
  archiveDir: path.join(testDir, 'archive'),
  compress: false,
  deleteAfter: 0,
  dryRun: true
});

console.log('\n测试 2: 归档单个文件（压缩）');
archiveLogFiles([logFile1], {
  archiveDir: path.join(testDir, 'archive'),
  compress: true,
  deleteAfter: 0,
  dryRun: true
});

console.log('\n测试 3: 归档多个文件（压缩）');
archiveLogFiles([logFile1, logFile2, logFile3], {
  archiveDir: path.join(testDir, 'archive'),
  compress: true,
  deleteAfter: 0,
  dryRun: true
});

console.log('\n测试 4: 真正归档（dry-run=false）');
archiveLogFiles([logFile1, logFile2, logFile3], {
  archiveDir: path.join(testDir, 'archive'),
  compress: true,
  deleteAfter: 0,
  dryRun: false
});

console.log('\n✓ 所有测试完成！');
console.log('\n清理测试文件...');
try {
  // 清理所有文件
  const files = fs.readdirSync(testDir);
  for (const file of files) {
    const filePath = path.join(testDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const subFiles = fs.readdirSync(filePath);
      for (const subFile of subFiles) {
        fs.unlinkSync(path.join(filePath, subFile));
      }
      fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }
  fs.rmdirSync(testDir);
  console.log('✓ 清理完成\n');
} catch (error) {
  console.log(`✗ 清理失败: ${error.message}\n`);
}

console.log('测试完成！');
