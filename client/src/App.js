
import { useState } from 'react';
const url = process.env.NODE_ENV === 'production' ? 'https://course-tools-demo.onrender.com/' : 'http://127.0.0.1:8000/';
function App() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("No response yet");
  function sendMessage() {
    if (message === "") {
      return;
    } 
    fetch(`${url}query`, {
      method: 'POST',
      body: JSON.stringify({ prompt: message }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      return response.json();
    }).then(data => {
      setResponse(data.response);
    });
    setMessage("");
  }
  function handleMessage(e) {   
    setMessage(e.target.value); 
  }
  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-4xl">Ask Anything!</h1>
      <div className="mt-5 flex gap-2">
        <input type="text" placeholder="Type your message here" value={message} className="input input-bordered w-full max-w-xs" onInput={handleMessage} />
        <button className="btn" onClick={sendMessage}>Send</button>
      </div>
      <div className="card mt-10">
        <h2 className="text-xl">Response</h2>
        <div className="mt-5">
        🤖: {response}
        </div>
      </div>
    </div>
  );
}

export default App;
