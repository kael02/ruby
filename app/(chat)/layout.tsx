import { SidebarDesktop } from '@/components/sidebar-desktop';
import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return null;
  }

  const { data: files, error } = await supabase.storage
    .from('uploads')
    .list(user.id);

  if (error) {
    console.log('error', error);
  }

  console.log('files', files);

  return (
    <div className='relative justify-between flex h-[calc(100vh_-_theme(spacing.16))] overflow-hidden'>
      {/* @ts-ignore */}
      <SidebarDesktop />
      <div className='group w-full mx-auto overflow-auto pl-0 animate-in duration-300 ease-in-out peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px]'>
        {children}
      </div>
    </div>
  );
}
