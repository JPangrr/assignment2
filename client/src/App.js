import React, { useState } from 'react';
import { VegaLite } from 'react-vega';
import * as d3 from 'd3-dsv';

const url = process.env.NODE_ENV === 'production' 
  ? 'https://assignment2-lozb.onrender.com' 
  : 'http://127.0.0.1:8000/';

const userImage = 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg';
const systemImage = 'https://img.freepik.com/free-vector/floating-robot_78370-3669.jpg';

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [fileData, setFileData] = useState(null);
  const [vegaSpec, setVegaSpec] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [tableVisible, setTableVisible] = useState(false); // State for table visibility

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // File Upload
  const handleFileUpload = (file) => {
    if (file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = () => {
        const parsedData = d3.csvParse(reader.result, d3.autoType);
        setFileData(parsedData);
      };
      reader.readAsText(file);
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'System', text: 'Please upload a valid CSV file.', userImg: systemImage }
      ]);
    }
  };

  // Check message relevance
  const checkMessageRelevance = (message, columnsInfo) => {
    const columnNames = columnsInfo.map(col => col.name.toLowerCase());
    const keywords = ["plot", "chart", "bar", "line", "visualize", "show", "display"];
    
    const messageWords = message.toLowerCase().split(" ");
    const containsColumn = messageWords.some(word => columnNames.includes(word));
    const containsKeyword = messageWords.some(word => keywords.includes(word));
    
    return containsColumn || containsKeyword;
  };

  // Send message logic
  const sendMessage = async () => {
    if (message === "") return;

    if (!fileData) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'You', text: message, userImg: userImage },
        { sender: 'System', text: 'Please upload a dataset before sending a message.', userImg: systemImage }
      ]);
      setMessage("");  // Clear the input field
      return;
    }

    const columnsInfo = Object.keys(fileData[0]).map((columnName) => ({
      name: columnName,
      type: typeof fileData[0][columnName],
      sample: fileData[0][columnName].toString(),
    }));

    // Check if the message is relevant
    const isRelevant = checkMessageRelevance(message, columnsInfo);

    if (!isRelevant) {
      // If message is unrelated, show an error message
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'You', text: message, userImg: userImage },
        { sender: 'System', text: 'The system could not find relevant information in your request. Please ask a data-related question.', userImg: systemImage }
      ]);
      setMessage("");  // Clear the input field
      return;
    }

    // Send the relevant message to the system
    const newMessage = { sender: 'You', text: message, userImg: userImage };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    const promptForChart = message;

    try {
      const response = await fetch(`${url}query`, {
        method: 'POST',
        body: JSON.stringify({ prompt: promptForChart, columns_info: columnsInfo }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.vega_lite_spec) {
        const vegaSpecWithData = JSON.parse(data.vega_lite_spec);
        vegaSpecWithData.data = { values: fileData };

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'System', text: data.chart_description, vegaLiteSpec: vegaSpecWithData, userImg: systemImage }  // Include the Vega-Lite spec
        ]);
        setVegaSpec(vegaSpecWithData); // Set Vega specification
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'System', text: data.response, userImg: systemImage }
        ]);
      }
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'System', text: 'Failed to generate a response.', userImg: systemImage }
      ]);
    }

    setMessage("");  // Clear the input field
  };

  const handleMessage = (e) => setMessage(e.target.value);
  
  const toggleTable = () => {
    setTableVisible(!tableVisible);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-6">Data Visualization AI Assistant</h1>

      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-4">
        
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center ${
            dragging ? 'border-blue-500' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {dragging ? (
              <p className="text-blue-500">Release to upload!</p>
            ) : (
              <p>Drag and drop a file here, or click to upload</p>
            )}
          </label>
        </div>

        {/* Add margin between file upload and table preview button */}
        <div className="my-4 flex justify-center">
          {fileData && (
            <button className="bg-purple-900 text-white px-4 py-2 rounded-md" onClick={toggleTable}>
              {tableVisible ? 'Hide Table' : 'Show Table'}
            </button>
          )}
        </div>

        {/* Table Preview */}
        {tableVisible && fileData && (
          <div className="overflow-auto max-h-60 mb-4">
            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  {Object.keys(fileData[0]).map((key) => (
                    <th className="border border-gray-300 px-4 py-2" key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((val, colIndex) => (
                      <td className="border border-gray-300 px-4 py-2" key={colIndex}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex flex-col space-y-4 overflow-auto h-96 p-2 bg-gray-100 rounded-lg mb-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex items-end space-x-2">
                <img 
                  src={msg.userImg} 
                  alt={`${msg.sender} avatar`} 
                  className="w-10 h-10 rounded-full object-cover" 
                />
                <div className={`bg-purple-900 text-white rounded-lg p-3`}>
                  <span className="block font-semibold text-sm">{msg.sender}</span>
                  {msg.vegaLiteSpec && <VegaLite spec={msg.vegaLiteSpec} />}
                  <p>{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex mt-4">
          <input 
            type="text" 
            placeholder="Type your question here" 
            value={message} 
            onChange={handleMessage} 
            className="input input-bordered w-full px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-600" 
          />
          <button className="bg-purple-900 text-white px-4 py-2 rounded-r-lg" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;