'use client';

import { CreateMessage, useChat, type Message } from 'ai/react';

import { ChatList } from '@/components/chat-list';
import { ChatPanel } from '@/components/chat-panel';
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor';
import { EmptyScreen } from '@/components/empty-screen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import { ChatRequestOptions } from 'ai';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import UploadedFiles from './uploaded-files';

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview';
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[];
  id?: string;
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  console.log('render chat component');
  const router = useRouter();
  const path = usePathname();
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  );
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW);
  const [previewTokenInput, setPreviewTokenInput] = useState(
    previewToken ?? ''
  );

  const [selectedKeys, setSelectedKeys] = useState(new Set<string>([]));
  const selectedValue = useMemo(() => Array.from(selectedKeys), [selectedKeys]);

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      sendExtraMessageFields: true,
      onResponse(response) {
        console.log('call onResponse on chat page');
        console.log('response', response);

        if (response.status === 401) {
          toast.error(response.statusText);
        }
      },
      onFinish(message) {
        console.log('onFinish on chat page');
        console.log('messages', messages);
        console.log('onFinish message', message);
        if (!path.includes('chat')) {
          router.push(`/chat/${id}`, { shallow: true, scroll: false });
          router.refresh();
        }
      }
    });

  const appendWithAdditionalData = (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ): Promise<string | null | undefined> => {
    console.log('selectedKeys', selectedKeys);
    console.log('selectedValue', selectedValue);
    return append(message, {
      ...chatRequestOptions,
      options: {
        body: {
          selectedValue
        }
      }
    });
  };
  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={appendWithAdditionalData}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href='https://platform.openai.com/signup/'
                className='underline'
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className='font-mono'>ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder='OpenAI API key'
            onChange={(e) => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className='items-center'>
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput);
                setPreviewTokenDialog(false);
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className='absolute right-0 top-0'>
        <UploadedFiles
          selectedKeys={selectedKeys}
          setSelectedKeys={setSelectedKeys}
        />
      </div>
    </>
  );
}
