import path from "path";
import fs from "fs";
import { asyncExec } from "../exec.js";

const mapSeverity = (severity: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" => {
    switch (severity) {
        case "ERROR":
            return "HIGH";

        case "WARNING":
            return "MEDIUM";

        case "INFO":
            return "LOW";

        default:
            return "MEDIUM";
    }
};

export const getFindingsBySemgrep = async (scanId: string, repoPath: string) => {
    const reportPath = path.join(repoPath, "semgrep.json");

    try {
        await asyncExec(`
            docker run --rm \
            -v ${repoPath}:/src \
            semgrep/semgrep:latest \
            semgrep scan \
            --config=auto \
            --json \
            --output=/src/semgrep.json \
            /src
        `);
    } catch (err: any) {
        console.error("Semgrep execution failed:", err);
        return [];
    }

    try {
        const report = await fs.promises.readFile(
            reportPath,
            "utf-8"
        );

        const data = JSON.parse(report);

        if (!data.results || !Array.isArray(data.results)) {
            return [];
        }

        return data.results.map((finding: any) => ({
            scanId,
            tool: "SEMGREP",
            severity: mapSeverity(
                finding.extra?.severity
            ),
            status: "OPEN",
            title: finding.check_id || "Semgrep Finding",
            description:
                finding.extra?.message ||
                "Potential security issue detected",
            filePath: finding.path || "unknown",
            line: finding.start?.line || null,
            rawDetails: finding,
        }));
    } catch (err) {
        console.error(
            "Failed to read/parse Semgrep report:",
            err
        );
        return [];
    }
};