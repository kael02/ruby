import { createClient } from '@supabase/supabase-js';
import { Document } from 'langchain/document';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from './supabase-server';

const SPLIT_CHUNK_SIZE = 500;
const SPLIT_CHUNK_OVERLAP = 100;

export const docLoader = (file: File) => {
  switch (file.type) {
    case 'text/plain':
      return new TextLoader(file);
    case 'text/pdf':
      return new PDFLoader(file);
    default:
      throw new Error('unsupported file');
  }
};

export const ingestData = async (file: any, id: string) => {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(cookieStore);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    console.info('start ingesting data...');
    // const pdfLoader = new PDFLoader(file);

    const loader = docLoader(file);

    const rawDocs = await loader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: SPLIT_CHUNK_SIZE,
      chunkOverlap: SPLIT_CHUNK_OVERLAP
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    console.log('input docs', docs);

    console.log('creating supabase vector store...');

    const embeddedMetadata: Document<Record<string, any>>[] = docs.map(
      (doc) => ({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          userId: user.id,
          fileId: id
        }
      })
    );

    const vectorStore = await SupabaseVectorStore.fromDocuments(
      embeddedMetadata,
      new OpenAIEmbeddings(),
      {
        client,
        tableName: 'documents',
        queryName: 'match_documents'
      }
    );

    console.info('finish creating supabase vector store');
    console.info('finish ingesting data');
  } catch (error) {
    console.log('error', error);
    throw error;
  }
};
