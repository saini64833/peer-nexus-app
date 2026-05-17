import "./env.js";
import http            from "http";
import connectionDB    from "./db/index.js";
import { app }         from "./app.js";
import { initSocket }  from "./sockets/socketIndex.js";

const PORT = process.env.PORT || 8080;

connectionDB()
  .then(() => {
    // Create raw HTTP server so Socket.io can share the same port as Express
    const httpServer = http.createServer(app);

    // Boot Socket.io — attaches to httpServer, stores io on app
    initSocket(httpServer, app);

    httpServer.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Socket.io attached`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received — shutting down`);
      httpServer.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });