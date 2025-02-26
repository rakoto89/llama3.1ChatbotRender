document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const voiceBtn = document.getElementById("voice-btn");
    const stopBtn = document.getElementById("stop-btn");

    let recognition;
    let isSpeaking = false;
    let lastUserMessage = ""; // Stores last message to prevent repetition
    const synth = window.speechSynthesis;

    function appendMessage(sender, message) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");
        msgDiv.textContent = message;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removePreviousThinkingMessage() {
        const thinkingMessages = document.querySelectorAll(".bot-message.thinking");
        thinkingMessages.forEach(msg => msg.remove());
    }

    function sendMessage(text, useVoice = false) {
        if (!text.trim() || text === lastUserMessage) return; // Prevent duplicate messages

        lastUserMessage = text; // Store last message to prevent repetition

        // Append user message and ensure only one "Thinking..."
        appendMessage("user", text);
        userInput.value = "";

        removePreviousThinkingMessage();
        const thinkingMsg = document.createElement("div");
        thinkingMsg.classList.add("bot-message", "thinking");
        thinkingMsg.textContent = "Thinking...";
        chatBox.appendChild(thinkingMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: text }),
        })
        .then(response => response.json())
        .then(data => {
            removePreviousThinkingMessage(); // Remove "Thinking..." after response
            if (data.answer) {
                appendMessage("bot", data.answer);
                if (useVoice) speakResponse(data.answer);
            } else {
                appendMessage("bot", "Sorry, I couldn't find an answer.");
            }
        })
        .catch(() => {
            removePreviousThinkingMessage();
            appendMessage("bot", "Error: Could not get a response.");
        });
    }

    function speakResponse(text) {
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            synth.speak(utterance);
            isSpeaking = true;
            utterance.onend = () => { isSpeaking = false; };
        }
    }

    function stopSpeaking() {
        if (isSpeaking) {
            synth.cancel();
            isSpeaking = false;
        }
    }

    sendBtn.addEventListener("click", () => sendMessage(userInput.value, false));

    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") sendMessage(userInput.value, false);
    });

    voiceBtn.addEventListener("click", () => {
        if ("webkitSpeechRecognition" in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-US";

            recognition.onstart = () => {
                removePreviousThinkingMessage(); // Remove any old "Thinking..." bubbles
                appendMessage("bot", "Listening...");
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript === lastUserMessage) return; // Prevent duplicate messages

                lastUserMessage = transcript; // Store last message
                removePreviousThinkingMessage(); // Remove old "Thinking..."
                appendMessage("user", transcript);

                // Replace "Listening..." with "Thinking..."
                setTimeout(() => {
                    removePreviousThinkingMessage();
                    const thinkingMsg = document.createElement("div");
                    thinkingMsg.classList.add("bot-message", "thinking");
                    thinkingMsg.textContent = "Thinking...";
                    chatBox.appendChild(thinkingMsg);
                    chatBox.scrollTop = chatBox.scrollHeight;
                }, 500);

                // Call sendMessage AFTER UI updates
                setTimeout(() => {
                    sendMessage(transcript, true);
                }, 1000);
            };

            recognition.onerror = () => {
                removePreviousThinkingMessage(); // Ensure "Listening..." is removed
                appendMessage("bot", "Sorry, I couldn't hear you. Please try again.");
            };

            recognition.start();
        } else {
            alert("Voice recognition is not supported in this browser.");
        }
    });

    stopBtn.addEventListener("click", stopSpeaking);
});
