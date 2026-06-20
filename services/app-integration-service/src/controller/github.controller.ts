import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import axios from "axios";
import jwt from "jsonwebtoken";


export const githubWebhookController = async (req: Request, res: Response) => {
    try {
        console.log("========== WEBHOOK ==========");
        console.log("Event:", req.headers["x-github-event"]);

        const { action, repositories_removed } = req.body;

        if (action === "removed") {
            for (const repo of repositories_removed) {
                const repository = await prisma.repository.findFirst({
                    where: {
                        repo_name: repo.full_name,
                    },
                    include: {
                        installation: true,
                    }
                });

                if (!repository) continue;

                const token = jwt.sign(
                    { id: repository.installation.userId },
                    process.env.JWT_SECRET as string
                );

                await axios.delete(
                    `${process.env.SECURE_BOT_SERVICE_URL}/api/secure-bot/scan/delete/data/${repository.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                await prisma.repository.delete({
                    where: {
                        id: repository.id,
                    },
                });
            }
        }

        return res.sendStatus(200);
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: "Internal Server Error" })
    }
}