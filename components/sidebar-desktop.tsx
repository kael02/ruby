import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { ChatHistory } from './chat-history';
import { Sidebar } from './sidebar';
export async function SidebarDesktop() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return null;
  }

  return (
    <Sidebar className='peer absolute inset-y-0 z-30 hidden -translate-x-full border-r bg-muted duration-300 ease-in-out data-[state=open]:translate-x-0 lg:flex lg:w-[250px] xl:w-[300px]'>
      {/* @ts-ignore */}
      <ChatHistory userId={user.id} />
    </Sidebar>
  );
}
