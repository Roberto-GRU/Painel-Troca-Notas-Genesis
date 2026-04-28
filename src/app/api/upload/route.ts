import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const osId = formData.get('os_id') as string;
    const tipo = (formData.get('tipo') as string) || 'doc';

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

    const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `Arquivo maior que ${maxMb}MB` }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'text/xml', 'application/xml', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido (use PDF, XML, JPG, PNG)' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', osId ?? 'geral');
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name);
    const nome = `${tipo}_${Date.now()}${ext}`;
    const fullPath = path.join(uploadDir, nome);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const publicPath = `/uploads/${osId ?? 'geral'}/${nome}`;

    return NextResponse.json({ success: true, path: publicPath, nome: file.name });
  } catch (err) {
    console.error('[API upload]', err);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}
