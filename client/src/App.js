import React, { useState } from 'react';

const url = process.env.NODE_ENV === 'production' 
  ? 'https://course-tools-demo.onrender.com/' 
  : 'http://127.0.0.1:8000/';

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (message === "") return;

    const newMessage = { sender: 'You', text: message, userImg: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg' };
    setMessages([...messages, newMessage]);

    try {
      const response = await fetch(`${url}query`, {
        method: 'POST',
        body: JSON.stringify({ prompt: message }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setMessages([...messages, newMessage, { sender: 'System', text: data.response, userImg: 'https://img.freepik.com/free-vector/floating-robot_78370-3669.jpg' }]);
    } catch (error) {
      console.error("Error fetching the response:", error);
    }

    setMessage("");
  };

  const handleMessage = (e) => setMessage(e.target.value);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">AI Assistant</h1>
        <div className="flex flex-col space-y-4 overflow-auto h-96 p-2 bg-gray-100 rounded-lg">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex items-end space-x-2">
                <img src={msg.userImg} alt={msg.sender} className="w-8 h-8 rounded-full" />
                <div className={`bg-purple-900 text-white rounded-lg p-3 ${msg.sender === 'You' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                  <span className="block font-semibold text-sm">{msg.sender}</span>
                  <p>{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex mt-4">
          <input 
            type="text" 
            placeholder="Type your message here" 
            value={message} 
            onChange={handleMessage} 
            className="input input-bordered w-full px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-600" 
          />
          <button 
            className="bg-purple-900 text-white px-4 py-2 rounded-r-lg hover:bg-purple-700 transition duration-300"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
