import express from "express"
import { scanRepo } from "../controller/scan.controller.js"


const router: express.Router = express.Router()

router.post("/repo/:id", scanRepo)


export default router;