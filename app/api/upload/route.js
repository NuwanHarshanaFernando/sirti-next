import { NextRequest, NextResponse } from 'next/server';
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
      console.warn(`🚫 Upload attempt by unauthorized user: ${session.user.email} (${session.user.role})`);
      return NextResponse.json({ 
        error: "Insufficient permissions", 
        message: "Only administrators and managers can upload files" 
      }, { status: 403 });
    }

    const data = await request.formData();
    const file = data.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!allowedTypes.includes(file.type)) {
      console.warn(`🚫 Invalid file type upload attempt: ${file.type} by ${session.user.email}`);
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 });
    }

    
    const maxSize = 5 * 1024 * 1024; 
    if (file.size > maxSize) {
      console.warn(`🚫 File too large upload attempt: ${file.size} bytes by ${session.user.email}`);
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    
    const originalName = file.name;
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file extension. Only jpg, jpeg, png, gif, and webp files are allowed.' 
      }, { status: 400 });
    }

    
    if (!/^[a-zA-Z0-9._-]+$/.test(originalName)) {
      return NextResponse.json({ 
        error: 'Invalid filename. Only alphanumeric characters, dots, hyphens, and underscores are allowed.' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    
    const header = buffer.slice(0, 100).toString('hex');
    const maliciousPatterns = [
      '3c3f706870', 
      '3c736372697074', 
      '6a617661736372697074', 
    ];
    
    if (maliciousPatterns.some(pattern => header.includes(pattern))) {
      console.warn(`🚫 Malicious content detected in file upload by ${session.user.email}`);
      return NextResponse.json({ 
        error: 'File contains potentially malicious content.' 
      }, { status: 400 });
    }

    
    const secureFileName = `${uuidv4()}.${fileExtension}`;
    
    
    const uploadDir = join(process.cwd(), 'public', 'images', 'productImages');
    const filePath = join(uploadDir, secureFileName);

    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    
    await writeFile(filePath, buffer, { mode: 0o644 });


    
    const imagePath = `/images/productImages/${secureFileName}`;

    return NextResponse.json({ 
      success: true, 
      imagePath,
      originalName: originalName,
      size: file.size,
      uploadedBy: session.user.email,
      message: 'File uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    
    const session = await getServerSession(authOptions);
    console.error(`❌ Upload failed for user ${session?.user?.email || 'unknown'}: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        message: 'An internal error occurred. Please try again.' 
      },
      { status: 500 }
    );
  }
}
