import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Supabase認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ファイル情報を取得
    const { data: fileData, error: fileError } = await supabase
      .from('family_files')
      .select('*, families(*)')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 家族メンバーであることを確認
    const { data: memberData } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', fileData.family_id)
      .eq('user_id', user.id)
      .single();

    if (!memberData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Vector Storeを取得または作成
    let vectorStoreId = fileData.families.openai_vector_store_id;

    if (!vectorStoreId) {
      const shortId = fileData.family_id.slice(0, 8);
      console.log(
        `Creating new Vector Store for family: ${fileData.families.label} (${shortId})`
      );
      const vectorStore = await openai.beta.vectorStores.create({
        name: `[Care AI] ${shortId} - ${fileData.families.label}`,
        expires_after: {
          anchor: 'last_active_at',
          days: 365,
        },
      });
      vectorStoreId = vectorStore.id;

      // familiesテーブルを更新
      await supabase
        .from('families')
        .update({ openai_vector_store_id: vectorStoreId })
        .eq('id', fileData.family_id);
    }

    // 2. Supabase Storageからファイルをダウンロード
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('family-files')
      .download(fileData.supabase_path);

    if (downloadError || !fileBlob) {
      throw new Error('Failed to download file from Supabase Storage');
    }

    // 3. OpenAI Files APIにアップロード
    console.log(`Uploading file to OpenAI: ${fileData.original_name}`);
    const file = new File([fileBlob], fileData.original_name, {
      type: 'application/pdf',
    });

    const openaiFile = await openai.files.create({
      file: file,
      purpose: 'assistants',
    });

    // 4. Vector Storeにファイルをattach
    console.log(`Attaching file to Vector Store: ${vectorStoreId}`);
    const vectorStoreFile = await openai.beta.vectorStores.files.create(
      vectorStoreId,
      {
        file_id: openaiFile.id,
      }
    );

    // 5. インデックス作成を待つ（ポーリング）
    let attempts = 0;
    const maxAttempts = 30; // 最大30秒
    let fileStatus = vectorStoreFile.status;

    while (
      fileStatus !== 'completed' &&
      fileStatus !== 'failed' &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedFile = await openai.beta.vectorStores.files.retrieve(
        vectorStoreId,
        vectorStoreFile.id
      );
      fileStatus = updatedFile.status;
      attempts++;
      console.log(`File indexing status: ${fileStatus} (attempt ${attempts})`);
    }

    if (fileStatus === 'failed') {
      throw new Error('Vector Store file indexing failed');
    }

    // 6. family_filesテーブルを更新
    const updateData: any = {
      openai_file_id: openaiFile.id,
      openai_vs_file_id: vectorStoreFile.id,
      index_status: fileStatus === 'completed' ? 'ready' : 'in_progress',
    };

    if (fileStatus === 'completed') {
      updateData.indexed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('family_files')
      .update(updateData)
      .eq('id', fileId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      openai_file_id: openaiFile.id,
      vector_store_id: vectorStoreId,
      vector_store_file_id: vectorStoreFile.id,
      status: fileStatus,
    });
  } catch (error: any) {
    console.error('Vector Store upload error:', error);

    // エラー情報をDBに記録
    const { fileId } = await request.json();
    if (fileId) {
      const supabase = await createClient();
      await supabase
        .from('family_files')
        .update({
          index_status: 'failed',
          last_error: error.message || 'Unknown error',
        })
        .eq('id', fileId);
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
