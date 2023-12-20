import { createClient as createServerClient } from '@/lib/supabase-server';
import { StreamingTextResponse, Message as VercelChatMessage } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

import { ChatPayload, addChats } from '@/app/actions';
import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { BytesOutputParser } from 'langchain/schema/output_parser';
import { RunnableSequence } from 'langchain/schema/runnable';
import {
  SupabaseFilterRPCCall,
  SupabaseVectorStore
} from 'langchain/vectorstores/supabase';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

export const runtime = 'edge';

const combineDocumentsFn = (docs: Document[], separator = '\n\n') => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join(separator);
};

const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === 'user') {
      return `Human: ${message.content}`;
    } else if (message.role === 'assistant') {
      return `Assistant: ${message.content}`;
    } else {
      return `${message.role}: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join('\n');
};

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;
const condenseQuestionPrompt = PromptTemplate.fromTemplate(
  CONDENSE_QUESTION_TEMPLATE
);

const ANSWER_TEMPLATE = `You are an assistant, you must answer user's question and reply "I do not know" when you can't answer user's question.

Answer the question based only on the following context and chat history:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
`;
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

/**
 * This handler initializes and calls a retrieval chain. It composes the chain using
 * LangChain Expression Language. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#conversational-retrieval-chain
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const previousMessages = messages.slice(0, -1);
    const currentMessageContent = messages[messages.length - 1].content;
    const cookieStore = cookies();

    const supabase = createServerClient(cookieStore);

    const user = (await supabase.auth.getSession()).data.session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const askFiles: string[] = body.selectedValue;

    console.log('body', body);
    // const docId2 = "aa3e334a-6a91-4481-9954-ebb67a089109";

    // const docId1 = "ba9432a3-7598-475f-b993-ec2173130390";

    // const { handlers } = LangChainStream();

    const customHandlers = {
      handleLLMEnd: async (_output: any, runId: string) => {
        const llmAnswer = _output.generations[0][0].text;
        const title = messages[0].content.substring(0, 100);
        const id = body.id ?? nanoid();

        const payload: ChatPayload = {
          id,
          title,
          userId: '6b981dab-5fe0-4d92-816b-3a51a4097eb1',
          messages: [
            ...messages,
            {
              content: llmAnswer,
              role: 'assistant'
            }
          ]
        };

        await addChats(payload);
      }
    };

    const model = new ChatOpenAI({
      modelName: 'gpt-4-1106-preview',
      temperature: 0.25,
      verbose: true,
      callbacks: [customHandlers]
    });

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );
    const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
      client,
      tableName: 'documents',
      queryName: 'match_documents'
    });

    /**
     *  use LangChain Expression Language to compose two chains.
     *
     *
     * https://js.langchain.com/docs/guides/expression_language/cookbook
     */
    // const standaloneQuestionChain = RunnableSequence.from([
    //   condenseQuestionPrompt,
    //   model,
    //   new StringOutputParser()
    // ]);

    let resolveWithDocuments: (value: Document[]) => void;
    const documentPromise = new Promise<Document[]>((resolve) => {
      resolveWithDocuments = resolve;
    });

    const filterAskDoc = askFiles.reduce((acc, currentValue, currentIndex) => {
      console.log('currentValue', currentValue);
      const value = `metadata->>fileId.eq.${currentValue}`;
      return acc.concat(currentIndex === 0 ? value : `,${value}`);
    }, '');

    console.log('filterAskDoc', filterAskDoc);

    const funcFilterB: SupabaseFilterRPCCall = (rpc) =>
      rpc.filter('metadata->>userId', 'eq', `${user.id}`).or(filterAskDoc);

    const retriever = vectorStore.asRetriever({
      filter: funcFilterB,
      callbacks: [
        {
          handleRetrieverEnd(documents) {
            resolveWithDocuments(documents);
          }
        }
      ]
    });

    const retrievalChain = retriever.pipe(combineDocumentsFn);

    const answerChain = RunnableSequence.from([
      {
        context: RunnableSequence.from([
          (input) => input.question,
          retrievalChain
        ]),

        chat_history: (input) => input.chat_history,
        question: (input) => input.question
      },
      answerPrompt,
      model
    ]);

    const conversationalRetrievalQAChain = RunnableSequence.from([
      answerChain,

      new BytesOutputParser()
    ]);

    const stream = await conversationalRetrievalQAChain.stream({
      question: currentMessageContent,

      chat_history: formatVercelMessages(previousMessages)
    });

    const documents = await documentPromise;
    const serializedSources = Buffer.from(
      JSON.stringify(
        documents.map((doc) => {
          return {
            pageContent: doc.pageContent.slice(0, 50) + '...',
            metadata: doc.metadata
          };
        })
      )
    ).toString('base64');

    return new StreamingTextResponse(stream, {
      headers: {
        'x-message-index': (previousMessages.length + 1).toString(),
        'x-sources': serializedSources
      }
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// import { kv } from '@vercel/kv';
// import { OpenAIStream, StreamingTextResponse } from 'ai';
// import OpenAI from 'openai';

// import { supabaseClient } from '@/lib/supabase-client';
// import { nanoid } from '@/lib/utils';

// export const runtime = 'edge';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// export async function POST(req: Request) {
//   const json = await req.json();
//   const { messages, previewToken } = json;
//   // const userId = (await auth())?.user.id

//   const userId = await (await supabaseClient.auth.getUser()).data.user?.id;
//   if (!userId) {
//     return new Response('Unauthorized', {
//       status: 401
//     });
//   }

//   if (previewToken) {
//     openai.apiKey = previewToken;
//   }

//   const res = await openai.chat.completions.create({
//     model: 'gpt-4-1106-preview',
//     messages,
//     temperature: 0.7,
//     stream: true
//   });

// const stream = OpenAIStream(res, {
//   async onCompletion(completion) {
//     const title = json.messages[0].content.substring(0, 100);
//     const id = json.id ?? nanoid();
//     const createdAt = Date.now();
//     const path = `/chat/${id}`;
//     const payload = {
//       id,
//       title,
//       userId,
//       createdAt,
//       path,
//       messages: [
//         ...messages,
//         {
//           content: completion,
//           role: 'assistant'
//         }
//       ]
//     };
//     await kv.hmset(`chat:${id}`, payload);
//     await kv.zadd(`user:chat:${userId}`, {
//       score: createdAt,
//       member: `chat:${id}`
//     });
//   }
// });

//   return new StreamingTextResponse(stream);
// }
