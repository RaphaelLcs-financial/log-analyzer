const fs = require('fs');
const path = require('path');

/**
 * Archive log files
 */
function archiveLogFiles(files, options = {}) {
  const archiveDir = options.archiveDir || './archive';
  const compress = options.compress || false;
  const deleteAfter = options.deleteAfter || 0;
  const dryRun = options.dryRun || false;

  console.log(`\n📦 归档日志文件\n`);
  console.log(`归档目录: ${archiveDir}`);
  console.log(`压缩: ${compress ? '是' : '否'}`);
  console.log(`删除原文件: ${deleteAfter > 0 ? `归档 ${deleteAfter} 天后` : '否'}`);
  console.log(`预览模式: ${dryRun ? '是' : '否'}`);

  // 创建归档目录
  if (!dryRun && !fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log(`✓ 创建归档目录: ${archiveDir}`);
  }

  const archives = [];

  for (const file of files) {
    try {
      const filePath = path.resolve(file);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.log(`\n⏭  跳过: ${file}`);
        console.log(`   原因: 文件不存在`);
        continue;
      }

      const fileStats = fs.statSync(filePath);

      // 获取文件修改时间
      const modifiedTime = fileStats.mtime;
      const modifiedDate = new Date(modifiedTime);

      // 检查文件是否够老（可以被归档）
      if (deleteAfter > 0) {
        const daysSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceModified < deleteAfter) {
          console.log(`\n⏭  跳过: ${file}`);
          console.log(`   原因: 文件太新 (${daysSinceModified.toFixed(1)} 天)`);
          continue;
        }
      }

      console.log(`\n📄 归档: ${file}`);

      // 读取文件内容
      const fileContent = fs.readFileSync(filePath);

      // 生成归档文件名
      const dateStr = modifiedDate.toISOString().split('T')[0];
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      const archiveName = `${baseName}_${dateStr}.log${compress ? '.gz' : ''}`;
      const archivePath = path.join(archiveDir, archiveName);

      console.log(`   原文件: ${filePath}`);
      console.log(`   修改时间: ${modifiedDate.toISOString()}`);
      console.log(`   归档文件: ${archivePath}`);

      if (dryRun) {
        console.log(`   [预览] 会创建归档文件 (大小: ${(fileContent.length / 1024).toFixed(2)} KB)`);
        archives.push({
          originalFile: file,
          archivePath,
          originalSize: fileContent.length,
          archiveSize: 0,
          savedSpace: 0,
          compressed: false
        });
        continue;
      }

      // 压缩（如果需要）
      let archivedContent;
      let compressed = false;
      let archiveSize = 0;
      let compressionRatio = 0;

      if (compress) {
        try {
          archivedContent = require('zlib').gzipSync(fileContent);
          compressed = true;
          archiveSize = archivedContent.length;
          compressionRatio = (archivedContent.length / fileContent.length * 100).toFixed(2);
          console.log(`   压缩率: ${compressionRatio}%`);
        } catch (error) {
          console.log(`   压缩失败: ${error.message}`);
          archivedContent = fileContent;
          compressed = false;
          archiveSize = fileContent.length;
        }
      } else {
        archivedContent = fileContent;
        compressed = false;
        archiveSize = fileContent.length;
      }

      // 写入归档文件
      try {
        fs.writeFileSync(archivePath, archivedContent);

        // 显示归档信息
        const archiveStats = fs.statSync(archivePath);
        const savedSpace = fileContent.length - archiveStats.size;
        const savedSpaceMB = (savedSpace / 1024 / 1024).toFixed(2);
        const savedSpacePercent = fileContent.length > 0 ? ((savedSpace / fileContent.length) * 100).toFixed(2) : 0;

        console.log(`   ✓ 归档成功`);
        console.log(`   原文件大小: ${(fileContent.length / 1024).toFixed(2)} KB`);
        console.log(`   归档文件大小: ${(archiveStats.size / 1024).toFixed(2)} KB`);
        console.log(`   节省空间: ${savedSpaceMB} MB (${savedSpacePercent}%)`);

        archives.push({
          originalFile: file,
          archivePath,
          originalSize: fileContent.length,
          archiveSize,
          savedSpace,
          compressed
        });
      } catch (error) {
        console.log(`   ✗ 归档失败: ${error.message}`);
        continue;
      }

      // 删除原文件（如果需要）
      if (deleteAfter > 0) {
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✓ 删除原文件`);
        } catch (error) {
          console.log(`   ✗ 删除原文件失败: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`\n✗ 处理文件失败: ${file}`);
      console.log(`   错误: ${error.message}`);
      continue;
    }
  }

  // 显示归档摘要
  console.log(`\n\n📊 归档摘要\n`);
  console.log(`总文件数: ${files.length}`);
  console.log(`成功归档: ${archives.length}`);

  if (archives.length > 0) {
    let totalOriginalSize = 0;
    let totalArchiveSize = 0;
    let totalSavedSpace = 0;

    for (const archive of archives) {
      totalOriginalSize += archive.originalSize;
      totalArchiveSize += archive.archiveSize;
      totalSavedSpace += archive.savedSpace;
    }

    console.log(`总原文件大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`总归档文件大小: ${(totalArchiveSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`总节省空间: ${(totalSavedSpace / 1024 / 1024).toFixed(2)} MB`);
    console.log(`压缩率: ${totalArchiveSize > 0 ? ((totalSavedSpace / totalOriginalSize) * 100).toFixed(2) : 0}%`);
  }
}

/**
 * Archive a directory
 */
function archiveDirectory(dir, options = {}) {
  const dirPath = path.resolve(dir);

  console.log(`\n📂 归档目录: ${dirPath}`);

  // 查找所有日志文件
  const logFiles = [];
  const commonLogPatterns = [
    '*.log',
    '*.log.*',
    '*.txt',
    'app.*',
    'server.*',
    'error.*',
    'access.*',
    'debug.*',
    'info.*',
    'warn.*'
  ];

  console.log(`扫描日志文件...\n`);

  for (const pattern of commonLogPatterns) {
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && file.match(new RegExp(pattern.replace('*', '.*')))) {
            logFiles.push(filePath);
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      continue;
    }
  }

  console.log(`找到 ${logFiles.length} 个日志文件\n`);

  // 归档文件
  archiveLogFiles(logFiles, options);
}

/**
 * Show archive statistics
 */
function showArchiveStats(archiveDir) {
  const dirPath = path.resolve(archiveDir);

  console.log(`\n📊 归档统计\n`);
  console.log(`归档目录: ${archiveDir}\n`);

  if (!fs.existsSync(dirPath)) {
    console.log(`归档目录不存在`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  let totalSize = 0;
  let fileCount = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
      fileCount++;
    } catch (error) {
      continue;
    }
  }

  console.log(`归档文件数: ${fileCount}`);
  console.log(`总归档大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`平均文件大小: ${fileCount > 0 ? (totalSize / fileCount / 1024).toFixed(2) : 0} KB`);
}

module.exports = {
  archiveLogFiles,
  archiveDirectory,
  showArchiveStats
};
