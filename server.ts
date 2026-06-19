import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.ts";
import {
  getOrCreateUser,
  fetchFullSyncPayload,
  insertPlayer,
  saveBulkPlayers,
  insertTeam,
  saveBulkTeams,
  insertMatch,
  saveBulkMatches,
  insertTournament,
  saveSetting,
  deleteSettingEntry
} from "./src/db/queries.ts";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing with larger size limits for bulk match history syncing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 1. Health Probe
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 2. Auth user sync on first login
  app.post("/api/auth/sync", requireAuth, async (req: any, res) => {
    try {
      const { uid, email } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "Missing required auth info on body." });
      }
      const syncResult = await getOrCreateUser(uid, email);
      res.json({ success: true, user: syncResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Complete database state fetch
  app.get("/api/sync-data", requireAuth, async (req, res) => {
    try {
      const payload = await fetchFullSyncPayload();
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Save Player/Players
  app.post("/api/players", requireAuth, async (req, res) => {
    try {
      const { list, item } = req.body;
      if (list && Array.isArray(list)) {
        await saveBulkPlayers(list);
        return res.json({ success: true, count: list.length });
      } else if (item) {
        const persisted = await insertPlayer(item);
        return res.json({ success: true, player: persisted });
      }
      res.status(400).json({ error: "Invalid players payload." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Save Team/Teams
  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const { list, item } = req.body;
      if (list && Array.isArray(list)) {
        await saveBulkTeams(list);
        return res.json({ success: true, count: list.length });
      } else if (item) {
        const persisted = await insertTeam(item);
        return res.json({ success: true, team: persisted });
      }
      res.status(400).json({ error: "Invalid teams payload." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Save Match/Matches
  app.post("/api/matches", requireAuth, async (req, res) => {
    try {
      const { list, item } = req.body;
      if (list && Array.isArray(list)) {
        await saveBulkMatches(list);
        return res.json({ success: true, count: list.length });
      } else if (item) {
        const persisted = await insertMatch(item);
        return res.json({ success: true, match: persisted });
      }
      res.status(400).json({ error: "Invalid matches payload." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Save Tournament
  app.post("/api/tournaments", requireAuth, async (req, res) => {
    try {
      const { item } = req.body;
      if (item) {
        const persisted = await insertTournament(item);
        return res.json({ success: true, tournament: persisted });
      }
      res.status(400).json({ error: "Invalid tournaments payload." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Put Setting
  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Settings require a primary key." });
      }
      const persisted = await saveSetting(key, value);
      res.json({ success: true, setting: persisted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Delete Setting
  app.delete("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const result = await deleteSettingEntry(key);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Static Server Middleware Setup for Single-Page Application support
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode; wrapping Vite Dev Server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode; serving static production dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application successfully booted on host 0.0.0.0, port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal startup crash in server.ts:", err);
});
