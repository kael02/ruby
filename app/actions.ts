'use server';
import { createClient } from './../lib/supabase-server';

import { supabase } from '@/lib/supabase';
import { Message as VercelChatMessage } from 'ai';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export interface ChatPayload {
  id: string;
  userId: string;
  title: string;
  messages: VercelChatMessage[];
}

export async function getChats(userId: string) {
  console.log('getting chats for userId', userId);

  const { data, error } = await supabase
    .from('chats')
    .select()
    .eq('userId', userId);

  console.log('chats are', data);

  if (error) {
    console.error('Error getting chats from supabase', error);
    throw new Error('error trying get chats');
  }
  return data;
}

export async function addChats(payload: ChatPayload) {
  console.info('adding new chat for user', payload.userId);

  console.log('add chat payload', payload);

  const { error } = await supabase.from('chats').upsert(payload);

  if (error) {
    console.error('Error adding chats to supabase', error);
    throw new Error('error trying to add chats to supabase');
  }
}

export async function getChat(id: string, userId: string) {
  // const chat = await kv.hgetall<Chat>(`chat:${id}`);

  // if (!chat || (userId && chat.userId !== userId)) {
  //   return null;
  // }

  // return chat;removeChat

  console.log(`getting chat for chat id ${id} and userId ${userId}`);

  const { data, error } = await supabase
    .from('chats')
    .select()
    .eq('id', id)
    .eq('userId', userId)
    .maybeSingle();

  console.log('chat is', data);

  if (error) {
    console.error('Error getting chat', error);
    throw new Error('error trying to get single chat');
  }
  return data;
}

export async function removeChat(id: string) {
  // const session = await auth();

  // if (!session) {
  //   return {
  //     error: 'Unauthorized'
  //   };
  // }

  // const uid = await kv.hget<string>(`chat:${id}`, 'userId');

  // if (uid !== session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   };
  // }

  const cookieStore = cookies();

  const supabaseServer = createClient(cookieStore);

  const user = (await supabaseServer.auth.getUser()).data.user;

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: chat, error: getChatError } = await supabase
    .from('chats')
    .select()
    .eq('id', id)
    .maybeSingle();

  console.log('get chat from removeChat', chat);

  if (getChatError) {
    console.error(getChatError);
    throw new Error(
      `error getting chat with id ${id}: ${getChatError.message}`
    );
  }

  if (chat.userId !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error: removeChatError } = await supabase
    .from('chats')
    .delete()
    .eq('id', id);

  if (removeChatError) {
    console.error('cannot remove chat due to', removeChatError);
    throw new Error(`error when remove chat ${id}: removeChatError.message`);
  }

  revalidatePath('/');
  return revalidatePath(`/chat/${id}`);
}

export async function clearChats() {
  const cookieStore = cookies();

  const supabase = createClient(cookieStore);

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    console.log('Unauthorized');
    throw new Error('Unauthorized');
  }

  const { error: removeChatError } = await supabase
    .from('chats')
    .delete()
    .eq('userId', user.id);

  if (removeChatError) {
    console.error(`error removing chats: ${removeChatError}`);
    throw new Error(`error removing chats due to ${removeChatError.message}`);
  }

  revalidatePath('/');
  return redirect('/');

  // const session = await auth();

  // if (!session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   };
  // }

  // const chats: string[] = await kv.zrange(
  //   `user:chat:${session.user.id}`,
  //   0,
  //   -1
  // );
  // if (!chats.length) {
  //   return redirect('/');
  // }removeChat
  // const pipeline = kv.pipeline();

  // for (const chat of chats) {
  //   pipeline.del(chat);
  //   pipeline.zrem(`user:chat:${session.user.id}`, chat);
  // }

  // await pipeline.exec();

  // revalidatePath('/');
  // return redirect('/');
}

export const getSharedChat = async (id: string) => {
  const { data, error } = await supabase
    .from('chats')
    .select()
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('error getting chat', error);
    throw new Error(`error getting chat with id ${id}: ${error.message}`);
  }

  return data;
};

// export async function getSharedChat(id: string) {
//   const chat = await kv.hgetall<Chat>(`chat:${id}`);

//   if (!chat || !chat.sharePath) {
//     return null;
//   }

//   return chat;
// }

export async function shareChat(id: string) {
  const cookieStore = cookies();

  const supabase = createClient(cookieStore);

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    console.error('Unauthorized');
    throw new Error('Unauthorized');
  }

  const { data: chat, error: getChatError } = await supabase
    .from('chats')
    .select()
    .eq('id', id)
    .maybeSingle();

  if (getChatError) {
    console.error('error getting chat', getChatError);
    throw new Error(
      `error getting chat with id ${id}: ${getChatError.message}`
    );
  }

  if (!chat) {
    console.error('chat is empty');
    throw new Error('chat is empty');
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  };

  const { data, error } = await supabase
    .from('chats')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error(`error add sharePath to chat ${id}`, error);
    throw new Error(`error add sharePath to chat ${id}: ${error.message}`);
  }

  return data;
  // const session = await auth();

  // if (!session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   };
  // }

  // const chat = await kv.hgetall<Chat>(`chat:${id}`);

  // if (!chat || chat.userId !== session.user.id) {
  //   return {
  //     error: 'Something went wrong'
  //   };
  // }

  // const payload = {
  //   ...chat,
  //   sharePath: `/share/${chat.id}`
  // };

  // await kv.hmset(`chat:${chat.id}`, payload);

  // return payload;
}

export async function getUserUploadedFiles() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase.storage.from('uploads').list(user.id);

  if (error) {
    console.error(`cannot get uploaded files for user ${user.id}`);
    throw new Error(`cannot get uploaded files for user ${user.id}`);
  }

  return data;
}
