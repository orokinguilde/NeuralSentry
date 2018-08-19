const Discord = require('discord.js');
const fs = require('fs');

const client = new Discord.Client();

const adjectives = [
    'suspect',
    'étrange',
    'bizarre',
    'chelou',
    'peu compétent'
];

let pendings = {};
let notifPendings = {};

let emojiUp;
let emojiDown;

client.on('guildMemberAdd', (member) => {
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
        .filter(m => m.roles.some(r => r.name === 'recrutement'))
        .map(m => m.user)
        //.filter(u => u.username.indexOf('Akamelia') === 0 || u.username.indexOf('general_shark') !== -1)

    const adjective = adjectives[Math.trunc(Math.random() * adjectives.length)];
    const msg = `Mes scanners viennent de détecter un individu *${adjective}* sur **${member.guild.name}** : **${member}**\r\nQuels sont vos ordres ?\r\n(Choisir une des deux réactions)`;
    
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
        userToAsk.createDM().then(sendToChannel);
    }

    const channel = member.guild.channels.find('name', 'vérification-tenno');
    if(channel)
        channel.send(msg).then(m => sendToMessage(channel, m));
    
    pendings[pending.id] = pending;
});

client.on('message', (message) => {
    if(message.author.id === client.user.id)
        return;
    
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
});

client.on('messageReactionAdd', (msgReact, user) => {
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
});

client.login(process.env.TOKEN || fs.readFileSync('./token').toString().trim());
