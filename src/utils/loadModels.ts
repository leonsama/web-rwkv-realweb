export const loadFile = async (
  file: File,
  onProgress?: (progress: number) => void,
  onContentLength?: (contentLength: number) => void,
  onLoadedLength?: (loadedLength: number) => void
): Promise<Uint8Array[]> => {
  const stream = file.stream();
  const reader = stream.getReader();

  const contentLength = file.size;
  if (contentLength <= 1000) {
    console.error("😡 Model file is too small, please check the model file");
    alert("Model file is too small, please check the model file");
    throw new Error("Model file is too small, please check the model file");
  }

  onContentLength?.(contentLength);

  let receivedLength = 0;
  let chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedLength += value.length;
    chunks.push(value);

    onProgress?.((receivedLength / contentLength) * 100);
    onLoadedLength?.(receivedLength);
  }

  console.log("✅ Model loaded from file:\n", file.name);

  return chunks;
};
