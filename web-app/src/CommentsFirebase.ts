import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  authDomain: "miranda-comments.firebaseapp.com",
  projectId: "miranda-comments",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

function extractUserToken(): string {
  const storedToken = localStorage.getItem('user_token');
  if (storedToken) {
    try {
      const parsed = JSON.parse(storedToken);
      if (parsed && typeof parsed.token === 'string') {
        return parsed.token;
      }
    } catch (e) {
      console.log("Invalid token format, generating new one");
    }
  }
  return generateUserToken();
}

export async function addComment(scoreId: string, measureId: string, noteId: string, userName: string, text: string) {
  const addCommentFn = httpsCallable(functions, 'addComment');
  try {
    const userToken = extractUserToken();
    const payload = {
      scoreId: String(scoreId),
      measureId: String(measureId),
      noteId: String(noteId),
      userName,
      text,
      userToken
    };


    const result = await addCommentFn(payload);
    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function getComments(scoreId: string) {
  const getCommentsFn = httpsCallable(functions, 'getComments');
  try {
    const userToken = extractUserToken();
    const payload = {
      scoreId: String(scoreId),
      userToken
    };


    try {
      const result = await getCommentsFn(payload);
      const response = result?.data as any

      if (response?.comments) {
        return response.comments;
      } else if (Array.isArray(result?.data)) {
        return result.data;
      } else {
        console.warn("Unexpected response format:", result?.data);
        return [];
      }
    } catch (callableError: any) {
      console.error("Error with getComments:", callableError);
      return [];
    }
  } catch (error) {
    console.error("Error in getComments:", error);
    return [];
  }
}

export async function getCommentsForElement(scoreId: string, elementType: string, elementId: string) {
  try {
    const allComments = await getComments(scoreId);

    if (elementType === 'note') {
      return allComments.filter((comment: any) => comment.noteId === elementId);
    } else if (elementType === 'measure') {
      return allComments.filter((comment: any) => comment.measureId === elementId);
    }

    return [];
  } catch (error) {
    console.error(`Error getting comments for ${elementType} ${elementId}:`, error);
    return [];
  }
}

function generateUserToken(): string {
  const existingToken = localStorage.getItem('user_token');

  if (existingToken) {
    try {
      const parsed = JSON.parse(existingToken);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.token === 'string' &&
        typeof parsed.created === 'number'
      ) {
        return parsed.token;
      }
    } catch (e) {
      console.log("Token existente inválido, generando uno nuevo");
    }
  }

  const randomBytes = new Uint8Array(16);
  window.crypto.getRandomValues(randomBytes);

  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const token = `ut_${base64}`;

  const tokenData = {
    token,
    created: Date.now(),
    fingerprint: generateBasicFingerprint()
  };

  localStorage.setItem('user_token', JSON.stringify(tokenData));

  return token;
}

function generateBasicFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    `${screen.width}x${screen.height}`
  ];

  let hash = 0;
  const str = components.join('|||');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  return hash.toString(16);
}

export interface Comment {
  id: string
  scoreId: string;
  measureId: string;
  noteId: string;
  userId: string;
  userName: string;
  commentText: string;
  timestamp: string;
}
