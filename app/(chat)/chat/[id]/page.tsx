import { type Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getChat } from '@/app/actions';
import { Chat } from '@/components/chat';
import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const session = await supabase.auth.getSession();

  const user = session.data.session?.user;

  if (!user) {
    return {};
  }

  const chat = await getChat(params.id, user.id);
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const session = await supabase.auth.getSession();

  const user = session.data.session?.user;

  if (!user) {
    redirect(`/sign-in?next=/chat/${params.id}`);
  }

  console.log('render ChatPage');

  const chat = await getChat(params.id, user.id);

  if (!chat) {
    notFound();
  }

  if (chat?.userId !== user.id) {
    notFound();
  }

  return <Chat id={chat.id} initialMessages={chat.messages} />;
}
