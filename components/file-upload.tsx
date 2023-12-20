'use client';

import { cn } from '@/lib/utils';
import { FC, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buttonVariants } from './ui/button';
import { IconClip } from './ui/icons';

interface FileUploaderProps {
  onUploadFinished?: () => void;
}

const FileUploader: FC<FileUploaderProps> = ({ onUploadFinished }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File>();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = async (e: any) => {
    let files = [...e.target.files];

    console.log('file', files);

    const file = files[0];

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    console.log('file', file);

    const response = await fetch('/api/process-pdf', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      console.log('process pdf api');
      toast.success('File uploaded');
      setIsUploading(false);
      if (onUploadFinished) {
        onUploadFinished();
      }
    } else {
      toast.error('Error uploading file');
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          if (inputRef.current) {
            inputRef.current.click();
          }
        }}
        className={cn(
          buttonVariants({ size: 'sm', variant: 'outline' }),
          'absolute left-0 top-4 h-8 w-8 rounded-full bg-background p-0 sm:left-4'
        )}
      >
        <IconClip className='h-6 w-6' />
        <span className='sr-only'>New Chat</span>
      </button>
      <input
        ref={inputRef}
        type='file'
        onChange={uploadFile}
        className='hidden'
      />
    </>
  );
};

export default FileUploader;
