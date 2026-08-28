const { execSync } = require('child_process');

try {
  execSync('npm --prefix jianghu-bot/web-dashboard run build');
  console.log('Build passed successfully');
} catch (error) {
  console.error('Build failed:', error);
}
