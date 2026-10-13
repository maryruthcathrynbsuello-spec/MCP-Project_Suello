module.exports = {
  apps: [
    {
      name: "mcp-file-server",
      script: "dist/server/index.js",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
    },
    {
      name: "ngrok-tunnel",
      // CHANGE ME: full path from (Get-Command ngrok).Source
      script: "C:\\ngrok\\ngrok.exe",
      interpreter: "none",
      // CHANGE ME: your static domain
      args: "http --url=https://finally-deviate-guiding.ngrok-free.dev 127.0.0.1:3000 --log=stdout",
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};