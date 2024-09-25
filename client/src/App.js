import React, { useState } from 'react';
import { VegaLite } from 'react-vega';
import * as d3 from 'd3-dsv';

const url = process.env.NODE_ENV === 'production' 
  ? 'https://course-tools-demo.onrender.com/' 
  : 'http://127.0.0.1:8000/';

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [fileData, setFileData] = useState(null);
  const [tableVisible, setTableVisible] = useState(true);
  const [vegaSpec, setVegaSpec] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = () => {
        const parsedData = d3.csvParse(reader.result, d3.autoType);
        setFileData(parsedData);
        setMessages([...messages, { sender: 'System', text: 'CSV file uploaded successfully!' }]);
      };
      reader.readAsText(file);
    } else {
      setMessages([...messages, { sender: 'System', text: 'Please upload a valid CSV file.' }]);
    }
  };

  const toggleTable = () => {
    setTableVisible(!tableVisible);
  };

  const sendMessage = async () => {
    if (message === "") return;
    if (!fileData) {
      setMessages([...messages, { sender: 'System', text: 'Please upload a CSV file first.' }]);
      return;
    }
  
    const newMessage = { sender: 'You', text: message };
    setMessages([...messages, newMessage]);
  
    // Construct the dataset summary for the prompt
    const datasetSummary = fileData.reduce((summary, row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (!summary[key]) {
          summary[key] = { sampleValues: [], type: typeof value };
        }
        if (summary[key].sampleValues.length < 3) { // Limit sample values
          summary[key].sampleValues.push(value);
        }
      });
      return summary;
    }, {});
  
    // Prepare the prompt for chart generation
    const promptForChart = `
      You are a data visualization assistant. 
      I have a dataset with the following columns and types:
      ${JSON.stringify(datasetSummary, null, 2)}
      
      Here is my question: "${message}"
      
      Please generate a Vega-Lite specification for the chart that answers this question.
    `;
  
    try {
      const response = await fetch(`${url}query`, {
        method: 'POST',
        body: JSON.stringify({ prompt: promptForChart }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
  
      if (data.vegaLiteSpec) {
        setVegaSpec(data.vegaLiteSpec);
        
        // Prepare the prompt for description generation
        const promptForDescription = `
          Based on the following Vega-Lite specification:
          ${JSON.stringify(data.vegaLiteSpec, null, 2)}
          
          Please provide a textual description of the chart and its key insights.
        `;
  
        // Generate the description
        const descriptionResponse = await fetch(`${url}query`, {
          method: 'POST',
          body: JSON.stringify({ prompt: promptForDescription }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const descriptionData = await descriptionResponse.json();
  
        setMessages([...messages, newMessage, { sender: 'System', text: descriptionData.description }]);
      } else {
        setMessages([...messages, newMessage, { sender: 'System', text: data.response }]);
      }
  
    } catch (error) {
      setMessages([...messages, { sender: 'System', text: 'Failed to generate a response.' }]);
    }
    setMessage("");
  };

  const handleMessage = (e) => setMessage(e.target.value);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-6">Data Visualization AI Assistant</h1>

      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-4">
        {/* File Upload */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block mb-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />

        {/* Toggle Table Preview Button */}
        <div className="flex justify-center mb-4">
          <button
            className="bg-purple-900 text-white px-4 py-2 rounded-md"
            onClick={toggleTable}
          >
            {tableVisible ? 'Hide Table' : 'Show Table'}
          </button>
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

        {/* Chat History */}
        <div className="flex flex-col space-y-4 overflow-auto h-96 p-2 bg-gray-100 rounded-lg mb-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex items-end space-x-2">
                <div className={`bg-purple-900 text-white rounded-lg p-3`}>
                  <span className="block font-semibold text-sm">{msg.sender}</span>
                  <p>{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input for Messaging */}
        <div className="flex mt-4">
          <input 
            type="text" 
            placeholder="Type your question here" 
            value={message} 
            onChange={handleMessage} 
            className="input input-bordered w-full px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-600" 
          />
          <button 
            className="bg-purple-900 text-white px-4 py-2 rounded-r-lg"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>

        {/* Vega-Lite Chart */}
        {vegaSpec && (
          <div className="mt-4">
            <VegaLite spec={vegaSpec} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;