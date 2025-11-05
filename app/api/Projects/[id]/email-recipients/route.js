import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
    try {
        const projectId = params?.id;
        if (!projectId || !ObjectId.isValid(projectId)) {
            return NextResponse.json({ success: false, error: "Invalid project id" }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const projObjId = new ObjectId(projectId);
        const project = await db.collection("Projects").findOne(
            { _id: projObjId },
            { projection: { projectName: 1, assignedManagers: 1, users: 1, warehouseManager: 1 } }
        );
        if (!project) {
            return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
        }
        const orConds = [
            { role: "admin" },
            { assignedProject: projObjId },
            { assignedProject: projectId },
            { availaleProjects: projObjId },
            { availaleProjects: projectId },
        ];
        const idSet = new Set();
        (project.assignedManagers || []).forEach((id) => id && idSet.add(id.toString()));
        (project.users || []).forEach((id) => id && idSet.add(id.toString()));
        if (project.warehouseManager) idSet.add(project.warehouseManager.toString());
        const projectUserIds = Array.from(idSet).map((id) => new ObjectId(id));
        if (projectUserIds.length > 0) {
            orConds.push({ _id: { $in: projectUserIds } });
        }
        const users = await db.collection("users")
            .find({ $or: orConds }, { projection: { email: 1, role: 1, assignedProject: 1, availaleProjects: 1 } })
            .toArray();
        const emails = Array.from(new Set(users.map((u) => u.email).filter((e) => typeof e === "string" && e.includes("@"))));
        return NextResponse.json({
            success: true,
            project: { id: projectId, name: project.projectName },
            counts: {
                usersMatched: users.length,
                emails: emails.length,
                projectUserIds: projectUserIds.length,
            },
            emails,
            sampleUsers: users.slice(0, 10),
        });
    } catch (err) {
        console.error("email-recipients error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
