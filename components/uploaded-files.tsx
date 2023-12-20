'use client';
import { getUserUploadedFiles } from '@/app/actions';
import { truncateString } from '@/lib/utils';

import { Listbox, ListboxItem } from '@nextui-org/react';
import { FileObject } from '@supabase/storage-js';
import {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useEffect,
  useState
} from 'react';

export const ListboxWrapper = ({ children }: { children: ReactNode }) => (
  <div className='w-[260px] grow border-small px-1 py-2 rounded-small border-default-200 dark:border-default-100'>
    {children}
  </div>
);

interface UploadedFilesProps {
  selectedKeys: Set<string>;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
}

export interface UploadedFileItemProps {
  item: FileObject;
}

const UploadedFileItem: FC<UploadedFileItemProps> = ({ item }) => {
  return (
    <ListboxItem key={item.id}>
      {truncateString({ target: item.name, maxLength: 25 })}
    </ListboxItem>
  );
};

const UploadedFiles: FC<UploadedFilesProps> = ({
  selectedKeys,
  setSelectedKeys
}) => {
  const [files, setFiles] = useState<FileObject[]>();
  useEffect(() => {
    console.log('fetching');

    const fetchFiles = async () => {
      const uploaded = await getUserUploadedFiles();
      console.log('files uploaded', uploaded);
      setFiles(uploaded);
    };

    fetchFiles();
  }, []);

  return (
    <div className='flex flex-col h-full'>
      <ListboxWrapper>
        <h2 className='text-xl font-bold text-center mb-8 mt-4'>
          Uploaded Files
        </h2>
        <Listbox
          aria-label='Multiple selection example'
          variant='flat'
          disallowEmptySelection
          selectionMode='multiple'
          selectedKeys={selectedKeys}
          // TODO: fix this ts error
          //@ts-ignore
          onSelectionChange={setSelectedKeys}
        >
          {files && files?.length > 0 ? (
            files.map((item) => (
              <ListboxItem key={item.id}>
                {truncateString({ target: item.name, maxLength: 25 })}
              </ListboxItem>
            ))
          ) : (
            <ListboxItem key='empty-item'>No item</ListboxItem>
          )}
        </Listbox>
      </ListboxWrapper>
    </div>
  );
};

export default UploadedFiles;
