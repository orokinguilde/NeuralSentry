const Discord = require('discord.js');

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

    const emojiUp = '👍'//member.guild.emojis.find('name', '👍');
    const emojiDown = member.guild.emojis.find('name', '👎');
    const emojiBeaugoss = member.guild.emojis.find('name', 'beaugoss');

    const usersToAsk = member.guild.members
        .filter(m => m.some(r => r.name === 'recrutement'))
        .map(m => m.user)
        //.filter(u => u.username.indexOf('Akamelia') === 0 || u.username.indexOf('general_shark') !== -1)

    const adjective = adjectives[Math.trunc(Math.random() * adjectives.length)];
    const msg = `Mes scanners viennent de détecter un individu *${adjective}* sur **${member.guild.name}** : **${member}**\r\nQuels sont vos ordres ?\r\n(autoriser = :thumbsup: | refuser = :beaugoss:)`;
    const sendToChannel = (channel) => {
        channel.send(msg).then(m => {
            pending.notifyMessages.push({
                id: m.id,
                channelId: channel.id
            });
            notifPendings[m.id] = pending;
            
            m.react('👍');
            m.react(emojiBeaugoss);
        });
    }

    for(const userToAsk of usersToAsk)
    {
        userToAsk.createDM().then(sendToChannel);
    }

    const channel = member.guild.channels.filter(c => c.name === 'vérification-tenno').first();
    if(channel)
        channel.send(msg).then(sendToChannel);
    
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
                    msgReact.message.react('🐰');
                    msgReact.message.react('♥');
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
                    msgReact.message.react('😢');
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
                    const message = channel.fetchMessage(notifyMessage.id);

                    if(message)
                    {
                        message.edit(message.content.substring(0, message.content.indexOf('\r\n')).trim() + `\r\nChoix validé par ${user} : ${verified ? ':thumbsup:' : ':beaugoss:'}`);
                    }
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

client.login(process.env.TOKEN);
