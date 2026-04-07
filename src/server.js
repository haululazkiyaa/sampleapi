const http = require("http");
const app = require("./app");
const env = require("./config/env");
const connectDatabase = require("./config/db");

async function bootstrap() {
  await connectDatabase();

  const server = http.createServer(app);

  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
