import { StorageReference, UploadMetadata, UploadTask } from 'firebase/storage';

declare module 'fileUtils' {
  export const getFileHash: (uri: string) => Promise<string>;
}
