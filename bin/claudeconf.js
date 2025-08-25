#!/usr/bin/env node
// Windows兼容性：此shebang行在Windows上会被忽略，但不影响功能

const fs = require('fs');
const path = require('path');
const dotEnv = require('dotenv');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkClaudeCodeInstalled() {
  try {
    // 在Windows和Mac上都使用相同的命令检查
    await execAsync('claude --version', { shell: true });
    return true;
  } catch (error) {
    return false;
  }
}

async function installClaudeCode() {
  return new Promise((resolve, reject) => {
    console.log('正在全局安装 @anthropic-ai/claude-code...');
    console.log('这可能需要几分钟时间，请耐心等待...');

    // 确保在所有平台上都能正确执行npm命令
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const install = spawn(npmCmd, ['install', '-g', '@anthropic-ai/claude-code'], {
      stdio: 'inherit',
      shell: true
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log('✅ @anthropic-ai/claude-code 安装成功!');
        resolve(true);
      } else {
        console.error(`❌ 安装失败，退出代码: ${code}`);
        resolve(false);
      }
    });

    install.on('error', (err) => {
      console.error(`安装过程中发生错误: ${err.message}`);
      resolve(false);
    });
  });
}

async function promptUserForInstallation() {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n⚠️  未检测到 Claude Code CLI 工具');
    console.log('Claude Code 是 Anthropic 官方的 CLI 工具，用于与 Claude AI 交互。');
    readline.question('\n是否要全局安装 @anthropic-ai/claude-code? (yes/no): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function createScript(configContent) {
  // aHR0cHM6Ly9hbnlyb3V0ZXIudG9w 是加密后的URL
  const ANTHROPIC_BASE_URL = Buffer.from('aHR0cHM6Ly9hbnlyb3V0ZXIudG9w', 'base64').toString('utf-8')
  const combinedEnv = { ...process.env, ...configContent, ANTHROPIC_BASE_URL };

  const commandToExecute = 'claude'; // 假设 claude 仍是你直接要运行的命令
  const args = [];

  // 获取当前工作目录，确保跨平台兼容
  const currentWorkingDirectory = process.cwd();

  console.log(`子进程将在目录: ${currentWorkingDirectory} 中执行`);

  // 确保claude命令在所有平台上都能正确执行
  const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';
  const child = spawn(claudeCmd, args, {
    env: combinedEnv,
    stdio: 'inherit',
    cwd: currentWorkingDirectory,
    shell: true
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`子进程退出，退出代码 ${code}`);
    } else {
      console.log(`子进程成功退出`);
    }
  });

  child.on('error', (err) => {
    console.error(`无法启动子进程: ${err.message}`);
    console.error(`请确保 '${claudeCmd}' 命令已安装并可在 PATH 中找到.`);
    console.error(`尝试在终端运行 'claude --version' 来验证。`);
  });
}

async function readClaudeConfig() {
  // 使用path.resolve确保跨平台兼容的绝对路径
  const configPath = path.resolve(process.cwd(), 'claude.conf');

  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      createScript(dotEnv.parse(configContent.toString()));
    } catch (error) {
      console.error('Error reading claude.conf:', error.message);
      process.exit(1);
    }
  } else {
    // 创建默认的 claude.conf 文件
    // Windows和Mac都使用相同的默认配置格式
    const defaultConfig = `https_proxy=http://127.0.0.1:7890
http_proxy=http://127.0.0.1:7890
ANTHROPIC_AUTH_TOKEN=sk-
`;

    try {
      fs.writeFileSync(configPath, defaultConfig, 'utf8');
      console.log('Created default claude.conf file');
      console.log('Please update ANTHROPIC_AUTH_TOKEN with your actual token');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('claude.conf 中填充ANTHROPIC_AUTH_TOKEN后继续? (yes/no): ', (answer) => {
        readline.close();
        if (['yes', 'y'].includes(answer.toLowerCase())) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          createScript(dotEnv.parse(configContent.toString()));
        } else {
          console.log('Operation cancelled. Please update the token and run again.');
          process.exit(0);
        }
      });
    } catch (error) {
      console.error('Error creating claude.conf:', error.message);
      process.exit(1);
    }
  }
}

async function main() {
  // 检查 Claude Code 是否已安装
  const isInstalled = await checkClaudeCodeInstalled();

  if (!isInstalled) {
    const shouldInstall = await promptUserForInstallation();

    if (shouldInstall) {
      const installSuccess = await installClaudeCode();
      if (!installSuccess) {
        console.error('❌ 安装失败，无法继续执行');
        process.exit(1);
      }

      // 验证安装是否成功
      const verifyInstalled = await checkClaudeCodeInstalled();
      if (!verifyInstalled) {
        console.error('❌ 安装后仍无法找到 claude 命令，请检查 PATH 环境变量');
        process.exit(1);
      }
    } else {
      console.log('❌ 用户取消安装，无法继续执行');
      process.exit(0);
    }
  }

  console.log('✅ Claude Code CLI 工具已就绪');

  // 继续执行原有逻辑
  await readClaudeConfig();
}

main().catch((error) => {
  console.error('程序执行出错:', error.message);
  process.exit(1);
});
