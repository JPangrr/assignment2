const sendBtn = document.querySelector('#send-btn');
const promptInput = document.querySelector('#prompt-input');
const responseText = document.querySelector('#response-text');

promptInput.addEventListener('input', function(event) {
    sendBtn.disabled = event.target.value? false: true;
});

function sendMessage(){
    const promptInput = document.querySelector('#prompt-input');
    const prompt = promptInput.value;
    if (!prompt) {
        return;   
    }
    promptInput.value = '';
    
    fetch('/query', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
        headers: {
        'Content-Type': 'application/json'
        }
    }).then(response => {
        return response.json();
    }).then(data => {
        console.log(data);
        responseText.textContent = data.response;
    });
}
promptInput.addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        sendBtn.click();
    }
});
sendBtn.addEventListener('click', sendMessage);