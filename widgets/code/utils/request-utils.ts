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

export interface GraphQLResponse<T> {
  data: T;
}

export async function GraphQL<T = any>(path: string, query: string): Promise<GraphQLResponse<T>>  {
  const req = new Request(path);
  req.headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  req.method = 'POST';
  req.body = JSON.stringify({
    query,
  });
  let res = '';
  try {
    res = await req.loadString();
    return JSON.parse(res) as GraphQLResponse<T>;
  }
  catch(err) {
    throw `Failed to parse JSON.\n`+
        `- URL: ${req.url}\n` +
        `- Body:\n${res}`;
  }
}
