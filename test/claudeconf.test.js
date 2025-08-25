const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('claudeconf CLI', () => {
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const configPath = path.join(process.cwd(), 'claude.conf');
  const packagePath = path.join(process.cwd(), 'package.json');
  const scriptPath = path.join(scriptsDir, 'cc');
  
  // 备份原始文件
  let originalPackageJson = null;
  let originalClaudeConf = null;

  beforeEach(() => {
    // 备份现有文件
    if (fs.existsSync(packagePath)) {
      originalPackageJson = fs.readFileSync(packagePath, 'utf8');
    }
    if (fs.existsSync(configPath)) {
      originalClaudeConf = fs.readFileSync(configPath, 'utf8');
    }
    
    // 清理测试文件
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  });

  afterEach(() => {
    // 恢复原始文件
    if (originalPackageJson) {
      fs.writeFileSync(packagePath, originalPackageJson);
    }
    if (originalClaudeConf) {
      fs.writeFileSync(configPath, originalClaudeConf);
    }
    
    // 清理测试生成的文件
    if (fs.existsSync(configPath) && !originalClaudeConf) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
    
    // 重置变量
    originalPackageJson = null;
    originalClaudeConf = null;
  });

  test('should create cc script in scripts directory', () => {
    fs.writeFileSync(configPath, 'test config content');
    
    execSync('node bin/claudeconf.js');
    
    expect(fs.existsSync(scriptPath)).toBe(true);
    expect(fs.statSync(scriptPath).mode & parseInt('755', 8)).toBeTruthy();
  });

  test('should read claude.conf file when it exists', () => {
    const configContent = 'test configuration';
    fs.writeFileSync(configPath, configContent);
    
    const output = execSync('node bin/claudeconf.js', { encoding: 'utf8' });
    
    expect(output).toContain('Claude configuration from claude.conf:');
    expect(output).toContain(configContent);
  });
});

