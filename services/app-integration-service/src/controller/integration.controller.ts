import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { App } from "octokit";


const githubApp = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
})


export const createInstallation = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id
        const { installationId } = req.body;

        const installation = await prisma.installation.create({
            data: {
                userId: userId,
                installationId: installationId
            }
        })

        return res.status(200).json({
            success: true,
            message: "Installation created successfully",
            data: installation
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            message: "Failed to create installation",
            error: err
        })
    }
}


export const syncRepos = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id
        const { installationId } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        let findInstallation = await prisma.installation.findFirst({
            where: { userId: userId }
        })

        if (!findInstallation) {
            if (!installationId) {
                return res.status(400).json({
                    success: false,
                    message: "installationId is required to register the application."
                })
            }
            findInstallation = await prisma.installation.create({
                data: {
                    userId: userId,
                    installationId: installationId
                }
            })
        }


        const ocktokit = await githubApp.getInstallationOctokit(Number(findInstallation.installationId))
        const response = await ocktokit.request("GET /installation/repositories", {
            per_page: 100
        })

        const githubRepos = response.data.repositories

        const syncedRepos = await Promise.all(
            githubRepos.map(async (repo) => {
                return prisma.repository.upsert({
                    where: { repo_name: repo.full_name },
                    update: {
                        repo_url: repo.html_url,
                        installationId: findInstallation!.id,
                    },
                    create: {
                        repo_name: repo.full_name,
                        repo_url: repo.html_url,
                        installationId: findInstallation!.id,
                    }
                });
            })
        );

        return res.status(200).json({
            success: true,
            message: "Repositories synced successfully",
            data: syncedRepos
        })
    } catch (err) {
        console.log(err)
    }
}