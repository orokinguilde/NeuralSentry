const Discord = require('discord.js');
const moment = require('moment');
const fs = require('fs');

const client = new Discord.Client();

const adjectives = [
    '*ressemblant à wasabite*',
    'équivalent à un primed nooby',
    'étrange',
    'comparable à un Baptiste pas net',
    'qui peut être une nouvelle recrue sharkplatine',
    'chelou',
    ',surement un futur AFK',
    'ressemblant à une Divine sauvage',
    'suspect',
    ',blood recrute peut être enfin...',
    'bizarre',
    'maître samouraï (palier 2)',
    'peu compétent'
];

let pendings = {};
let notifPendings = {};

let emojiUp;
let emojiDown;

var getPeriod = function() {
    var now = new Date(Date.now());
    var month = now.getMonth() + 1;
    var day = now.getDate();

    return {
        halloween: month === 10 && day > 20 || month === 11 && day < 2,
        christmas: month === 11 && day > 25 || month === 12 && day < 28,
        newYear: month === 12 && day >= 28 || month === 1 && day < 3
    };
}
const globals = {
    iconBefore: function() {
        var period = getPeriod();
        
        var icon = undefined;
        if(period.halloween) icon = ':jack_o_lantern:'
        if(period.christmas) icon = ':christmas_tree:'
        if(period.newYear) icon = ':confetti_ball:'

        return icon ? `${icon} ` : '';
    },
    iconAfter: function() {
        var period = getPeriod();
        
        var icon = undefined;
        if(period.halloween) icon = ':jack_o_lantern:'
        if(period.christmas) icon = ':christmas_tree:'
        if(period.newYear) icon = ':tada:'

        return icon ? ` ${icon}` : '';
    }
};

client.on('guildMemberAdd', (member) => {
    if(isDevelopping)
        return;
    
    const user = member.user;

    const pending = {
        guildId: member.guild.id,
        guildName: member.guild.name,
        userId: user.id,
        userName: user.username,
        date: Date.now(),
        notifyMessages: []
    };
    pending.id = pending.guildId + '_' + pending.userId;

    emojiUp = '👍'//member.guild.emojis.find('name', '👍');
    emojiDown = member.guild.emojis.find('name', 'beaugoss');

    const usersToAsk = member.guild.members
        .filter(m => m.roles.some(r => r.name.toLowerCase() === 'recrutement'))
        .map(m => m.user)
        //.filter(u => u.username.indexOf('Akamelia') === 0 || u.username.indexOf('general_shark') !== -1)

    const adjective = adjectives[Math.trunc(Math.random() * adjectives.length)];
    const msg = `${globals.iconBefore()}Mes scanners viennent de détecter un individu *${adjective}* sur **${member.guild.name}** : **${member}** [${member.displayName}]${globals.iconAfter()}\r\nQuels sont vos ordres ?\r\n(Choisir une des deux réactions)`;
    const msgChannel = `${globals.iconBefore()}Mes scanners viennent de détecter un individu *${adjective}* sur **${member.guild.name}** : **${member}**${globals.iconAfter()}\r\nQuels sont vos ordres ?\r\n(Choisir une des deux réactions)`;
    
    const sendToMessage = (channel, m) => {
        pending.notifyMessages.push({
            id: m.id,
            channelId: channel.id
        });
        notifPendings[m.id] = pending;
        
        m.react('👍');
        m.react(emojiDown);
    }
    const sendToChannel = (channel) => {
        channel.send(msg).then(m => sendToMessage(channel, m)).catch(e => console.error(e, channel));
    }

    for(const userToAsk of usersToAsk)
    {
        console.log(userToAsk.username);
        userToAsk.createDM().then(sendToChannel);
    }

    const channel = member.guild.channels.find('name', 'vérification-tenno');
    if(channel)
        channel.send(msgChannel).then(m => sendToMessage(channel, m));
    
    pendings[pending.id] = pending;
});

function findAllMessages(channel, callback, beforeMessageId)
{
    channel.fetchMessages({
        limit: 100,
        before: beforeMessageId
    }).then(messages => {
        messages = [...messages.values()];
        if(messages.length === 0)
        {
            if(!beforeMessageId)
                callback(messages);
            else
                callback([ messages ]);
        }
        else
        {
            const lastMessage = messages[messages.length - 1];
            findAllMessages(channel, (prevMessages) => {
                prevMessages.push(messages);
    
                let result = prevMessages.shift();
                result = result.concat(...prevMessages);
                callback(result);
            }, lastMessage.id);
        }
    });
}

function getAllUsersWithoutSignature(channel, includePreBotUsers, callback)
{
    const preBotDate = 1536525097555;

    findAllMessages(channel, (messages) => {
        const response = channel.guild.members
            .filter(m => !m.user.bot)
            .filter(m => !messages.some(msg => msg.author.id === m.user.id))
            .filter(m => includePreBotUsers || preBotDate - m.joinedTimestamp > 0)
            .map(m => {
                const memberCreationDate = moment(m.joinedTimestamp);
                const memberTimeCreationToNowSec = Math.trunc((Date.now() - m.joinedTimestamp) / 1000);

                const sec = memberTimeCreationToNowSec;
                const min = (memberTimeCreationToNowSec - sec) % 60;
                const h = ((memberTimeCreationToNowSec - sec) / 60) % 60;

                return {
                    user: m.user,
                    createDate: m.joinedTimestamp,
                    timeUntilNow: Date.now() - m.joinedTimestamp,
                    isPreBot: preBotDate - m.joinedTimestamp > 0
                };
            });

        callback(response);
    });
}

client.on('message', (message) => {
    if(message.author.id === client.user.id)
        return;
    
    if(isDevelopping)
    {
        if(message.content && /^\s*!testtimes\s*$/img.test(message.content))
        {
            const charteChannel = message.guild.channels.find('name', 'signature-de-la-charte');

            getAllUsersWithoutSignature(charteChannel, true, (info) => {
                const maxNameSize = info.map(i => i.user.username.length).reduce((p, c) => p > c ? p : c);

                const response = info.map((uInfo) => {
                    const pad = (value, nb, char, before) => {
                        value = value.toString();
                        char = char || '0';
                        nb = nb || 2;
                        if(before === undefined)
                            before = true;

                        while(value.length < nb)
                        {
                            if(before)
                                value = char + value;
                            else
                                value = value + char;
                        }
                        return value;
                    }

                    const createDate = moment(uInfo.createDate);
                    const timeUntilNow = pad(Math.trunc(uInfo.timeUntilNow / (1000 * 60 * 60 * 25))) + ' jour(s) ' + pad(Math.trunc(uInfo.timeUntilNow / (1000 * 60 * 60) % 25)) + ':' + pad(Math.trunc(uInfo.timeUntilNow / (1000 * 60) % 60)) + ':' + pad(Math.trunc(uInfo.timeUntilNow / 1000 % 60));

                    return `\`${pad(uInfo.user.username, maxNameSize, ' ', false)} ${createDate.format('DD/MM/YYYY HH:mm:ss')} - ${timeUntilNow} passé sans valider la charte\`${uInfo.timeUntilNow >= 2 * 24 * 60 * 60 * 1000 ? ' :snail:' : ''}${uInfo.isPreBot ? ' :shark:' : ''}`;
                });
                
                message.channel.send(response, {
                    split: true
                });
            })
        }
    }
    else
    {
        if(message.content && /^\s*!verifyeveryone\s*$/img.test(message.content))
        {
            if(message.member.roles.some(r => r.name === 'Modérateur Orokin'))
            {
                const role = message.member.guild.roles.find('name', 'verified');

                let nb = 0;
                for(member of message.guild.members.array())
                {
                    member.addRole(role);
                    ++nb;
                }

                if(nb === 0)
                    message.reply(`J'ai ajouté le rôle à aucun membre.`);
                else
                    message.reply(`J'ai ajouté le rôle à ${nb} membre${nb > 1 ? 's' : ''}.`);
            }
            else
            {
                message.reply(`Tu n'as pas le droit de faire ça! :rage: `);
            }
        }
        else
        {
            if(message.channel.type === 'dm')
            {
                message.reply('😡');
            }
        }
    }
});

client.on('messageReactionAdd', (msgReact, user) => {
    if(isDevelopping)
        return;
    
    if(user.id === client.user.id)
        return;

    const notifPending = notifPendings[msgReact.message.id];

    console.log(notifPending);
    console.log(msgReact.emoji.name);

    if(notifPending)
    {
        let isValid = false;
        let verified;
        switch(msgReact.emoji.name)
        {
            case '👍':
            {
                console.log(`T UP`);
                isValid = true;
                verified = true;

                const guild = client.guilds
                    .filter(guild => guild.id === notifPending.guildId)
                    .first();
                
                guild.fetchMember(notifPending.userId).then(member => {
                    console.log(`ADD ROLE accepté ON ${member.user.username}`);
                    
                    const role = guild.roles.find('name', 'verified');
                    member.addRole(role);
                })
                
                break;
            }

            case '👎':
            case 'beaugoss':
            {
                console.log(`T DOWN`);
                isValid = true;
                verified = false;

                const guild = client.guilds
                    .filter(guild => guild.id === notifPending.guildId)
                    .first();
                
                guild.fetchMember(notifPending.userId).then(member => {
                    console.log(`KICK ${member.user.username}`);
                    
                    member.createDM().then(dm => {
                        dm.send(`Nous sommes navrés de vous apprendre que votre connection au serveur *${notifPending.guildName}* n'a pu aboutir.`);

                        const role = guild.roles.find('name', 'kicked');
                        member.addRole(role).then(() => {
                            member.kick();
                        })
                    })
                })
                break;
            }
        }

        if(isValid)
        {
            delete pendings[notifPending.id];

            for(const notifyMessage of notifPending.notifyMessages)
            {
                const channel = client.channels.find('id', notifyMessage.channelId);
                
                if(channel)
                {
                    channel.fetchMessage(notifyMessage.id).then(message => {

                        if(message)
                        {
                            const content = message.content;
    
                            if(content)
                            {
                                message.edit(content.substring(0, content.indexOf('\r\n')).trim() + `\r\nChoix validé par ${user}`);
                            }

                            const onDone = () => {
                                if(verified)
                                {
                                    message.react(emojiUp);
                                    message.react('🐰');
                                    message.react('♥');
                                }
                                else
                                {
                                    message.react(emojiDown);
                                    message.react('😢');
                                }
                            };
    
                            const reactions = message.reactions.filter(r => r.me).array();
                            let index = 0;

                            const exec = () => {
                                if(index === reactions.length)
                                    return onDone();
                                
                                reactions[index++].remove().then(exec);
                            };

                            exec();
                        }
                    })
                }

                delete notifPendings[notifyMessage.id];
            }
            
            //msgReact.message.edit(msgReact.message.content.substring(0, msgReact.message.content.indexOf('\r\n')).trim() + `\r\nChoix validé : ${verified ? ':thumbsup:' : ':thumbsdown:'}`);
        }
    }
})

client.on('ready', () => {
    console.log('READY');

    /*
    setInterval(() => {

    }, 1000 * 60 * 60);*/
});

const isDebug = !process.env.TOKEN;
let isDevelopping = false;


isDevelopping = isDebug && isDevelopping;
console.log('DEBUG =', isDebug ? 'ON' : 'OFF');
console.log('DEV MODE =', isDevelopping ? 'ON' : 'OFF');

client.login(process.env.TOKEN || fs.readFileSync('./token').toString().trim());
