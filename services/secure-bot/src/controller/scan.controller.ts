import type { Request, Response } from "express";
import { prisma } from "../config/db.js";



export const scanRepo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Please provide id" })
        }

        return res.status(200).json({ message: "Repo scanned successfully" })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}