import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { IconNextChat, IconSeparator } from '@/components/ui/icons';
import { UserMenu } from '@/components/user-menu';
import { ChatHistory } from './chat-history';
import { SidebarMobile } from './sidebar-mobile';
import { SidebarToggle } from './sidebar-toggle';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase-server';

async function UserOrLogin() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const session = await supabase.auth.getSession();
  const user = session.data.session?.user;

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/api/auth/callback'
      }
    });
  };
  return (
    <>
      {user ? (
        <>
          <SidebarMobile>
            <ChatHistory userId={user.id} />
          </SidebarMobile>
          <SidebarToggle />
        </>
      ) : (
        <Link href='/' target='_blank' rel='nofollow'>
          <IconNextChat className='w-6 h-6 mr-2 dark:hidden' inverted />
          <IconNextChat className='hidden w-6 h-6 mr-2 dark:block' />
        </Link>
      )}
      <div className='flex items-center'>
        <IconSeparator className='w-6 h-6 text-muted-foreground/50' />
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Button onClick={signIn} variant='link' asChild className='-ml-2'>
            Login
          </Button>
        )}
      </div>
    </>
  );
}

export function Header() {
  return (
    <header className='sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl'>
      <div className='flex items-center'>
        <React.Suspense fallback={<div className='flex-1 overflow-auto' />}>
          <UserOrLogin />
        </React.Suspense>
      </div>
    </header>
  );
}
