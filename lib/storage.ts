import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, file);
  return getDownloadURL(snap.ref);
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  return uploadImage(file, `products/${productId}/${filename}`);
}

export async function uploadCategoryImage(file: File, categoryId: string): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  return uploadImage(file, `categories/${categoryId}/${filename}`);
}

export async function deleteImage(url: string): Promise<void> {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
}
