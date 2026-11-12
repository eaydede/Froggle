import { API_URL, sessionHeaders } from '../../platform/http';


export const submitFeedback = async (message: string): Promise<{ ok: boolean }> => {
  try {
    const response = await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: await sessionHeaders(),
      body: JSON.stringify({ message }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
};
