/*
 * Properties of the `message` object in the `whatsapp-web.js` library:
 * 
 * 1. id: Object containing information about the message's unique identifier.
 *   - id._serialized: String representing the unique identifier for the message.
 * 
 * 2. body: String containing the text content of the message.
 * 
 * 3. type: String representing the type of the message, such as 'text', 'image', 'video', etc.
 * 
 * 4. timestamp: Unix timestamp (in seconds) representing when the message was created.
 * 
 * 5. from: String representing the sender's ID, including the country code and phone number.
 * 
 * 6. to: String representing the recipient's ID, which is usually your own phone number.
 * 
 * 7. author: String representing the author's ID in the case of group messages. Undefined for direct messages.
 * 
 * 8. isForwarded: Boolean value indicating whether the message was forwarded.
 * 
 * 9. isStatus: Boolean value indicating whether the message is a status update.
 * 
 * 10. isStarred: Boolean value indicating whether the message is starred.
 * 
 * 11. broadcast: Boolean value indicating whether the message was sent as a broadcast.
 * 
 * 12. fromMe: Boolean value indicating whether the message was sent by you.
 * 
 * 13. hasMedia: Boolean value indicating whether the message contains media (e.g., image, video, audio).
 * 
 * 14. sender: Object containing information about the sender.
 *   - sender.id: Object with the sender's ID properties.
 *     - sender.id.user: String representing the sender's phone number.
 *   - sender.pushname: String representing the sender's name (if available).
 * 
 * 15. chat: Object containing information about the chat that the message is a part of.
 *   - chat.id: Object containing the chat's ID properties.
 *   - chat.name: String representing the name of the chat (usually the name of the contact or group).
 *   - chat.isGroup: Boolean value indicating whether the chat is a group chat.
 * 
 * 16. quotedMsg: Object containing information about the quoted message, if the message is a reply to another message.
 * 
 * Note: The properties listed above are not exhaustive, and some properties may not be available depending on the type
 * and context of the message. You can use `console.log(message)` to explore the full structure of the `message` object
 * and find other properties that may be of interest.
 */

const qrcode = require('qrcode-terminal');

const { Client } = require('whatsapp-web.js');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('dump.db');

// Create a table for messages if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    sendername TEXT,
    content TEXT,
    timestamp TEXT
)`);

const client = new Client();

const { Configuration, OpenAIApi } = require("openai");
const readlineSync = require("readline-sync");
require("dotenv").config();
const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY,});
const openai = new OpenAIApi(configuration);

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});


client.on('message_create', async message => {
    if (message.type === 'chat') {
        const sender = message.from;
        const receiver = message.to;
        const content = message.body;
        const timestamp = message.timestamp;
        const isSentByMe = message.id.fromMe;

        if (isSentByMe && sender === receiver) {
            console.log(`${timestamp} Message from ${sender} ${isSentByMe}:`);
            console.log(content);
            if (isSentByMe) {
                db.run(`INSERT INTO messages (sender, content, timestamp) VALUES (?, ?, ?)`, [sender, content, timestamp], err => {
                    if (err) {
                        console.error(err.message);
                    }
                });

                if (content.startsWith('gpt:')) {
                    const prompt = content.substring(4).trim(); // Remove 'gpt:' and trim whitespace
                    const messages = [];
                    messages.push({ role: "user", content: prompt });
                    try {
                        const completion = await openai.createChatCompletion({
                          model: "gpt-3.5-turbo",
                          messages: messages,
                        });
                  
                        const completion_text = completion.data.choices[0].message.content;
                        console.log(completion_text);

                        // Send the completion text as a reply
                        message.reply(completion_text);
                      
                      } catch (error) {
                        if (error.response) {
                          console.log(error.response.status);
                          console.log(error.response.data);
                        } else {
                          console.log(error.message);
                        }
                      }
                    
                } 
            }
        }
    }
});

client.on('message', async message => {
    // const sendername = message.sender.pushname || 'Unknown';
    const sender = message.from;
    const timestamp = message.timestamp;
    const content = message.body;
    const messagetype = message.type;

    console.log(`Messagetype: ${messagetype}`);

    if (message.type === 'chat') {
        console.log(`${timestamp} Message from ${sender}:`);
        console.log(content);
        console.log('------------------------------------');

        db.run(`INSERT INTO messages (sender, content, timestamp) VALUES (?, ?, ?)`, [sender, content, timestamp], err => {
            if (err) {
                console.error(err.message);
            }
        });

        if (content.startsWith('gpt:')) {
            const prompt = content.substring(4).trim(); // Remove 'gpt:' and trim whitespace
            const messages = [];
            messages.push({ role: "user", content: prompt });
            try {
                const completion = await openai.createChatCompletion({
                  model: "gpt-3.5-turbo",
                  messages: messages,
                });
          
                const completion_text = completion.data.choices[0].message.content;
                console.log(completion_text);

                // Send the completion text as a reply
                message.reply(completion_text);
              
              } catch (error) {
                if (error.response) {
                  console.log(error.response.status);
                  console.log(error.response.data);
                } else {
                  console.log(error.message);
                }
              }
            
        } 
    }
});

 
client.initialize();
