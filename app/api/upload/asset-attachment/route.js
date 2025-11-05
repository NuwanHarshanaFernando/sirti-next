import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const data = await request.formData();
    const file = data.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
    ];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images and PDF are allowed.' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const originalName = file.name;
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Invalid file extension.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(originalName)) {
      return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const secureFileName = `${uuidv4()}.${fileExtension}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'asset-attachments');
    const filePath = join(uploadDir, secureFileName);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    await writeFile(filePath, buffer, { mode: 0o644 });

    const storedPath = `/uploads/asset-attachments/${secureFileName}`;
    return NextResponse.json({ success: true, filePath: storedPath, originalName, size: file.size });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}


