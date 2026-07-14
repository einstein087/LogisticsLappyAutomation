const { spawn } = require("child_process");

const preferredPort = Number(process.env.PORT || 4000);
const maxPort = Number(process.env.MAX_TUNNEL_PORT || preferredPort + 10);
const subdomain = process.env.LOCAL_TUNNEL_SUBDOMAIN;

const startTunnel = (port) => {
  const args = ["localtunnel", "--port", String(port)];
  if (subdomain) {
    args.push("--subdomain", subdomain);
  }

  console.log(`Starting localtunnel to port ${port}...`);
  const tunnel = spawn("npx", args, { shell: true, stdio: "inherit" });

  tunnel.on("exit", (code) => {
    if (code === 0) {
      process.exit(0);
      return;
    }

    if (port >= maxPort) {
      console.error(`Localtunnel failed for ports ${preferredPort}-${maxPort}.`);
      process.exit(code || 1);
      return;
    }

    console.warn(`Localtunnel failed on port ${port}. Trying port ${port + 1}...`);
    startTunnel(port + 1);
  });
};

startTunnel(preferredPort);
