import express from "express";

const router = express.Router();

router.get("/", (_req, res) => {
  res.type("text").send("Express");
});

export default router;
