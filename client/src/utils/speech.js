export function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  return recognition;
}
