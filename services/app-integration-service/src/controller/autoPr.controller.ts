import { Request, Response } from "express"
import { prisma } from "../config/db.js";


export const changePrReviewerStatus = async (req: Request, res: Response) => {
    try {
        const { repoId } = req.params;
        if (!repoId) {
            return res.status(400).json({ message: "Please provide repository id" })
        }

        const repo: any = await prisma.repository.findUnique({
            where: {
                id: repoId as string,
            },
            select: {
                prReviewer: true
            }
        })

        if (!repo) {
            return res.status(400).json({ message: "Repo not found.." })
        }

        const updatedRepo = await prisma.repository.update({
            where: {
                id: repoId as string,
            },
            data: {
                prReviewer: !repo.prReviewer
            }
        })
        return res.status(200).json({ message: `Auto Pull-Request reviewer ${updatedRepo.prReviewer ? "enabled" : "disabled"} successfully` })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}   