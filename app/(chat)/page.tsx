import { Chat } from '@/components/chat';
import { createClient } from '@/lib/supabase-server';
import { nanoid } from '@/lib/utils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function IndexPage() {
  const id = nanoid();

  const cookieStore = cookies();

  const supabase = createClient(cookieStore);

  const session = await supabase.auth.getSession();

  // const session = await supabase.auth.getSession();

  if (!session.data.session) {
    redirect('/sign-in');
  }

  // return <Chat id={id} />;
  return <Chat id={id} />;
}
