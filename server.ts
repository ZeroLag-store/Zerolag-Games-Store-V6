import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware for API requests
  app.use(express.json());

  // Example API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Secure Order Creation API
  app.post("/api/orders", async (req, res) => {
    try {
      const { orderData } = req.body;
      
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: "Invalid order data" });
      }

      // In a real app, we would verify prices here against the database (SSOT)
      // and handle actual payment processing (Stripe, etc.)

      console.log("Processing order for:", orderData.userEmail);
      
      // For now, we return success as we've "processed" it on the backend
      res.json({ 
        success: true, 
        orderId: `BACKEND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        message: "Order processed successfully on the server"
      });
    } catch (error) {
      console.error("Order error:", error);
      res.status(500).json({ error: "Internal server error during order processing" });
    }
  });

  // AI-Powered Product Assistant (using Gemini)
  app.post("/api/ai/analyze-order", async (req, res) => {
    try {
      const { orderItems } = req.body;
      // This is where GEMINI_API_KEY would be used server-side
      // We'll return a mock AI insight for now to show the flow
      res.json({
        insight: `Base on your acquisition of ${orderItems.length} items, we suggest checking out our new PS Plus deals next week for maximum compatibility!`
      });
    } catch (error) {
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  // Proxy or handle other backend logic here
  // For example, if you wanted to move product fetching to the server:
  // app.get("/api/products", async (req, res) => { ... });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the dist directory in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
