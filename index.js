const { Telegraf } = require('telegraf');
const axios = require('axios');

const BASE_URL = 'http://01.mbd.ink:8000';
const API_KEY = 'HUCaZSh55WL8lrV0yxLs92j9GjSJGniW9IjjZMajrvwCKTMLQh';

const bot = new Telegraf('6495940443:AAE69j924o26kGELsikDMbtVvaabXiHsh_I');
const userStates = new Map();

const commandDescriptions = {
	'/help': 'Send the help message',
    '/dump_intelx': 'Download database parts from IntelX (Need Credit)',
    '/dump_naz': 'Download database parts from Naz.api (Need Credit)',
    '/redeem': 'redeem keys',
    '/balance': 'Get your current balance',
};

// Function to generate the command list with descriptions
function generateCommandList() {
    let commandList = 'Available commands :\n\n';
    for (const command in commandDescriptions) {
        commandList += `${command} ${commandDescriptions[command]}\n`;
    }
    return commandList;
}

bot.start(async (ctx) => {

    const telegramId = ctx.message.from.id;
    const telegramName = ctx.message.from.first_name;

    const createUserEndpoint = `${BASE_URL}/create_user`;
    const infoUserEndpoint = `${BASE_URL}/user/${telegramId}/info`;

    const headers = {
        'API-Key': API_KEY,
        'Content-Type': 'application/json',
    };

    console.log('Creating user...');
    console.log('Request URL:', createUserEndpoint);

    const payload = {
        custom_id: telegramId,
        name: telegramName,
        naz_credits: 100,
        intelx_credits: 100,
        is_illimited: false,
        is_admin: false,
    };

    try {
        const response = await axios.post(createUserEndpoint, payload, { headers });

        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        if (response.status === 200 || response.status === 201) {
            const userInfoResponse = await axios.get(infoUserEndpoint, { headers });

            console.log('Fetching user info...');
            console.log('Request URL:', infoUserEndpoint);
            console.log('Response status:', userInfoResponse.status);
            console.log('Response data:', userInfoResponse.data);

            if (userInfoResponse.status === 200) {
                const userData = userInfoResponse.data.user_info;
                const formattedInfo = `User ID: ${userData.custom_id}\nName: ${userData.name}\nNaz Credits: ${userData.naz_credits}\nIntelx Credits: ${userData.intelx_credits}`;
                ctx.reply(`User created successfully!\n\n${formattedInfo}`);
            } else {
                console.log('Failed to fetch user info:', userInfoResponse.status, userInfoResponse.statusText);
                ctx.reply('Failed to fetch user info. Please try again.');
            }
        } else {
            console.log('Failed to create user:', response.status, response.statusText);
            ctx.reply('Failed to create user. Please try again.');
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
        ctx.reply('An error occurred. Please try again later.');
    }
});

bot.command('help', (ctx) => {
    const userName = ctx.message.from.first_name;
    const userId = ctx.message.from.id;
    ctx.reply(`👋 Welcome ${userName}, your user id is ${userId} !\n\n${generateCommandList()}`);
});


// Balance command handler
bot.command('balance', async (ctx) => {
    const telegramId = ctx.message.from.id;
    const infoUserEndpoint = `${BASE_URL}/user/${telegramId}/info`;

    const headers = {
        'API-Key': API_KEY,
        'Content-Type': 'application/json',
    };

    try {
        const userInfoResponse = await axios.get(infoUserEndpoint, { headers });

        if (userInfoResponse.status === 200) {
            const userData = userInfoResponse.data.user_info;
            if (userData.is_illimited) {
                ctx.reply('You have unlimited credits!');
            } else {
                const formattedBalance = `Naz Credits: ${userData.naz_credits}\nIntelx Credits: ${userData.intelx_credits}`;
                ctx.reply(`Your credit balance:\n\n${formattedBalance}`);
            }
        } else {
            console.log('Failed to fetch user info:', userInfoResponse.status, userInfoResponse.statusText);
            ctx.reply('Failed to fetch user info. Please try again.');
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
        ctx.reply('An error occurred. Please try again later.');
    }
});


// Redeem command handler
bot.command('redeem', (ctx) => {
    userStates.set(ctx.message.from.id, { command: 'redeem', waitingForInput: true });
    ctx.reply('🔑 Please enter the key you want to redeem.');
});


// Dump Naz command handler
bot.command('dump_naz', (ctx) => {
    userStates.set(ctx.message.from.id, { command: 'naz', waitingForInput: true });
	ctx.reply(`🔎You can search for the following data:\n\n📧Search by mail\n🌍Search by domain name\n👤Search by name or nickname\n📱Search by phone number\n🔑Search by password\n📘Search for Facebook\n🌟Search by IP\n\n📤 Please send it to me in the chat.`);

});

// Dump Intelx command handler
bot.command('dump_intelx', (ctx) => {
    userStates.set(ctx.message.from.id, { command: 'intelx', waitingForInput: true });
    ctx.reply('🔎 What ID you want to dump? Please send it to me in the chat.');
});

bot.on('text', async (ctx) => {
    const userId = ctx.message.from.id;
    const userState = userStates.get(userId);

    if (userState && userState.waitingForInput) {
        const searchText = ctx.message.text;
        userStates.delete(userId);
		await ctx.reply('Please wait, log generation in progress...');

        let requestEndpoint = '';
        let requestBody = {};

        if (userState.command === 'naz') {
            requestEndpoint = `${BASE_URL}/request/naz`;
            requestBody = { custom_id: ctx.message.from.id, search_content: searchText };
            await handleRequest(ctx, requestEndpoint, requestBody, userState);
        } else if (userState.command === 'intelx') {
            requestEndpoint = `${BASE_URL}/request/intelx`;
            requestBody = { custom_id: ctx.message.from.id, search_content: searchText };
            await handleRequest(ctx, requestEndpoint, requestBody, userState);
        } else if (userState.command === 'redeem') {
            requestEndpoint = `${BASE_URL}/redeem`;
            requestBody = { key: searchText, custom_id: ctx.message.from.id };
            await handleRequest(ctx, requestEndpoint, requestBody, userState);
        }
    }
});

async function handleRequest(ctx, requestEndpoint, requestBody, userState, searchText) {
    try {
        const response = await executeRequest(ctx, requestEndpoint, requestBody, userState);

        switch (userState.command) {
            case 'naz':
            case 'intelx':
                await handleDataCommand(ctx, response, userState, searchText);
                break;
            case 'redeem':
                await handleRedeemCommand(ctx);
                break;
            default:
                console.error('Invalid command:', userState.command);
                ctx.reply('Invalid command. Please try again.');
                break;
        }
    } catch (error) {
        handleRequestError(ctx, error);
    }
}

async function handleDataCommand(ctx, response, userState, searchText) {
    const jsonData = response.data;
    let message = '';

    if (userState.command === 'naz') {
        const externalApiResponse = JSON.parse(jsonData.external_api_response.replace(/\\n/g, ''));
        const creditsRemaining = jsonData.naz_credits_remaining;

        const fileContent = Buffer.from(JSON.stringify(externalApiResponse, null, 2), 'utf-8');
        console.log('JSON Content:', JSON.stringify(externalApiResponse, null, 2)); // Log the content

        message = `Enjoy your NAZ file! Naz Credits remaining: ${creditsRemaining}`;
        ctx.replyWithDocument(
            { source: fileContent, filename: `${searchText}--${ctx.message.from.id}_naz.json` },
            { caption: message }
        );
    } else if (userState.command === 'intelx') {
		
        const externalApiResponse = jsonData.external_api_response;
        const creditsRemaining = jsonData.intelx_credits_remaining;
        let lines = externalApiResponse.split(/\n|\\\\n/);

		// Loop through the lines and edit them (for example, adding a prefix)
		for (let i = 0; i < lines.length; i++) {
			lines[i] = `${lines[i]}`; // Modify the line here as needed
		}

		// Join the lines back together with '\n'
		let editedText = lines.join('\n');
        const fileContent = editedText; // Convert JSON to text

        message = `Enjoy your INTELX file! Intelx Credits remaining: ${creditsRemaining}`;
        ctx.replyWithDocument(
            { source: Buffer.from(fileContent, 'utf-8'), filename: `${ctx.message.from.id}_intelx.txt` },
            { caption: message }
        );
    } 
}

async function handleRedeemCommand(ctx) {
    const message = '🎉 Key redeemed successfully!';
    ctx.reply(message);
}

async function executeRequest(ctx, requestEndpoint, requestBody, userState) {
    const headers = {
        'API-Key': API_KEY,
        'Content-Type': 'application/json',
    };

    try {
        const response = await axios.post(requestEndpoint, requestBody, { headers });
        return response;
    } catch (error) {
        throw error;
    }
}

function handleRequestError(ctx, error) {
    if (error.response) {
        const status = error.response.status;
        if (status === 400) {
            console.error('Key already redeemed.');
            ctx.reply('bad Key or Key already redeemed.');
        } else {
            console.error('An error occurred:', error.message);
            ctx.reply('An error occurred. Please try again later.');
        }
    } else {
        console.error('An error occurred:', error.message);
        ctx.reply('An error occurred. Please try again later.');
    }
}

function convertToText(data) {
    let text = '';

    // Generate formatted text
    let isFirstLine = true;
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const record = `(${data[key]})`;
            const formattedRecord = record.replace(/[( )]/g, '\n');
            text += `${isFirstLine ? '' : '\n'}${formattedRecord}`;
            if (isFirstLine) {
                isFirstLine = false;
            }
        }
    }

    // Remove the first line
    const lines = text.split('\n');
    if (lines.length > 1) {
        lines.splice(0, 1); // Remove the first line
    }
    text = lines.join('\n');

    // Add <@intelligencexsearcher_bot> at the end
    text += '\n<@intelligencexsearcher_bot>';
    
    return text.trim(); // Trim any leading/trailing whitespace
}



bot.launch();
