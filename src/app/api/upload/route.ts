/**
 * Upload de documentos para correção de OS.
 *
 * Arquivos são salvos em public/uploads/{osId}/{tipo}_{timestamp}.{ext}
 * e servidos estaticamente pelo Next.js via URL /uploads/...
 *
 * Segurança:
 *   - osId é sanitizado para apenas [a-zA-Z0-9_-] prevenindo path traversal
 *     (ex: osId='../../etc' viraria '' e seria rejeitado)
 *   - Extensão é validada além do MIME type porque o browser pode enviar
 *     MIME incorreto para arquivos renomeados
 *   - Rate limit de 20 uploads/minuto por IP para evitar enchimento de disco
 */
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`upload:${getClientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde um momento.' }, { status: 429 });
  }
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

    // Sanitize osId — only alphanumeric, underscores, hyphens; prevents path traversal
    const rawOsId = String(osId ?? 'geral');
    const safeOsId = rawOsId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeOsId) return NextResponse.json({ error: 'os_id inválido' }, { status: 400 });

    const baseDir    = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
    const uploadDir  = path.join(baseDir, safeOsId);
    await mkdir(uploadDir, { recursive: true });

    const allowedExts = ['.pdf', '.xml', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Extensão não permitida' }, { status: 400 });
    }
    const nome = `${tipo}_${Date.now()}${ext}`;
    const fullPath = path.join(uploadDir, nome);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const publicPath = `/uploads/${safeOsId}/${nome}`;

    return NextResponse.json({ success: true, path: publicPath, nome: file.name });
  } catch (err) {
    console.error('[API upload]', err);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}
