import { NextResponse } from 'next/server';
import { currentOwner, supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const me = await currentOwner();
  if (!me) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image must be under 5 MB.' }, { status: 400 });
    }

    const type = file.type.toLowerCase();
    if (!type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are accepted.' }, { status: 400 });
    }

    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const admin = supabaseAdmin();

    // Ensure photos bucket exists and is public
    await admin.storage.createBucket('photos', { public: true }).catch(() => {});

    const sanitizedOwner = me.ownerEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${sanitizedOwner}/avatar_${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from('photos')
      .upload(path, buf, {
        contentType: type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[UPLOAD PHOTO ERROR]', uploadError);
      return NextResponse.json({ error: 'Failed to upload photo to storage.' }, { status: 500 });
    }

    const { data: publicData } = admin.storage.from('photos').getPublicUrl(path);
    const photoUrl = publicData.publicUrl;

    return NextResponse.json({ url: photoUrl });
  } catch (err) {
    console.error('[UPLOAD PHOTO CATCH]', err);
    return NextResponse.json({ error: 'Failed to process image upload.' }, { status: 500 });
  }
}
