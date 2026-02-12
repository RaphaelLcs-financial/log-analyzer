const fs = require('fs');
const path = require('path');

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
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] INFO App started - Request ${i}`
).join('\n');

const logContent2 = Array(100).fill(0).map((_, i) =>
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] INFO API endpoint /users called - Request ${i}`
).join('\n');

const logContent3 = Array(10).fill(0).map((_, i) =>
  `[2026-02-12 10:${i.toString().padStart(2, '0')}:00.000Z] ERROR Database connection failed - Attempt ${i}`
).join('\n');

fs.writeFileSync(logFile1, logContent1, 'utf-8');
fs.writeFileSync(logFile2, logContent2, 'utf-8');
fs.writeFileSync(logFile3, logContent3, 'utf-8');

console.log('创建测试日志文件完成\n');

// 调用归档功能（通过 CLI）
const { execSync } = require('child_process');

console.log('测试 1: 归档单个文件（不压缩）');
try {
  execSync('node bin/cli.js archive ' + logFile1 + ' --archive-dir ' + path.join(testDir, 'archive') + ' --dry-run', {
    stdio: 'inherit'
  });
} catch (error) {
  console.log('测试失败:', error.message);
}

console.log('\n测试 2: 归档单个文件（压缩）');
try {
  execSync('node bin/cli.js archive ' + logFile1 + ' --archive-dir ' + path.join(testDir, 'archive') + ' --compress --dry-run', {
    stdio: 'inherit'
  });
} catch (error) {
  console.log('测试失败:', error.message);
}

console.log('\n测试 3: 归档多个文件（压缩）');
try {
  execSync('node bin/cli.js archive ' + logFile1 + ' ' + logFile2 + ' ' + logFile3 + ' --archive-dir ' + path.join(testDir, 'archive') + ' --compress --dry-run', {
    stdio: 'inherit'
  });
} catch (error) {
  console.log('测试失败:', error.message);
}

console.log('\n测试 4: 显示归档统计');
try {
  execSync('node bin/cli.js archive-stats --archive-dir ' + path.join(testDir, 'archive'), {
    stdio: 'inherit'
  });
} catch (error) {
  console.log('测试失败:', error.message);
}

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
  console.log('✓ 清理完成');
} catch (error) {
  console.log('清理失败:', error.message);
}

console.log('\n测试完成！');
