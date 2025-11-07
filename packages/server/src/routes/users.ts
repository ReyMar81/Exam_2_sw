import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Missing fields" });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name } });
      console.log(`[auth] created new user ${email}`);
    } else {
      console.log(`[auth] existing user logged in: ${email}`);
    }

    res.json(user);
  } catch (err) {
    console.error("[auth] login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
