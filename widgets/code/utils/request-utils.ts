export const RequestWithTimeout = (url: string, timeoutSeconds = 5) => {
  const request = new Request(url)
  request.timeoutInterval = timeoutSeconds
  return request
}

/** makes debugging JSON responses easier when something goes wrong */
export async function getJSON<T = any>(path: string) {
  const req = new Request(path);
  req.headers = {
    Accept: 'application/json'
  };
  let res = '';
  try {
    res = await req.loadString();
    return JSON.parse(res) as T;
  }
  catch(err) {
    throw `Failed to parse JSON.\n`+
        `- URL: ${req.url}\n` +
        `- Body:\n${res}`;
  }
}
