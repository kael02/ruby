'use client';

import { signOut } from 'next-auth/react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { IconExternalLink } from '@/components/ui/icons';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';

export interface UserMenuProps {
  user: User;
}

function getUserInitials(name: string) {
  const [firstName, lastName] = name.split(' ');
  return lastName ? `${firstName[0]}${lastName[0]}` : firstName.slice(0, 2);
}

export function UserMenu({ user }: UserMenuProps) {
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className='flex items-center justify-between'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='pl-0'>
            {user?.user_metadata ? (
              <Image
                className='w-6 h-6 transition-opacity duration-300 rounded-full select-none ring-1 ring-zinc-100/10 hover:opacity-80'
                src={
                  user?.user_metadata.avatar_url
                    ? `${user.user_metadata.avatar_url}`
                    : ''
                }
                alt={user.user_metadata.name ?? 'Avatar'}
                height={48}
                width={48}
              />
            ) : (
              <div className='flex items-center justify-center text-xs font-medium uppercase rounded-full select-none h-7 w-7 shrink-0 bg-muted/50 text-muted-foreground'>
                {user?.user_metadata.name
                  ? getUserInitials(user?.user_metadata.name)
                  : null}
              </div>
            )}
            <span className='ml-2'>{user?.user_metadata.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={8} align='start' className='w-[180px]'>
          <DropdownMenuItem className='flex-col items-start'>
            <div className='text-xs font-medium'>
              {user?.user_metadata.name}
            </div>
            <div className='text-xs text-zinc-500'>{user?.email}</div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href='https://vercel.com'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-between w-full text-xs'
            >
              Vercel Homepage
              <IconExternalLink className='w-3 h-3 ml-auto' />
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className='text-xs'>
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
