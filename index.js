var Hapi = require('hapi');
var SlackBot = require('slackbots');
var crypto = require('crypto');
var extraMappings = require('./mappings');

var server = new Hapi.Server();
server.connection({ host: "0.0.0.0", port: 8004 });

// create a bot
var bot = new SlackBot({
    token: process.env.SLACK_TOKEN,
    name: 'Github Build Monitor'
});

var userMap = new Map();

bot.on('start', function() {
    bot.getUsers().then(function (result) {
        // This is needed or things get sad :(
        var userList = result;
        for(var i = 0; i < userList.members.length; i++) {
            var user = userList.members[i];
            var email = user.profile.email;
            if (email) {
                userMap.set(email, user.id);
            }
            if (extraMappings[email]) {
                userMap.set(extraMappings[email], user.id);
            }
        }
    });
});

server.route({
    method: 'POST',
    path: '/',
    handler: function (request, reply) {

        var signature = request.headers['x-hub-signature'];

        // If no signature was provided they shouldn't be using this hook
        if (!signature) {
            return reply('Signature required.').code(403);
        }

        signature = signature.replace(/^sha1=/, '');
        var digest = crypto
            .createHmac('sha1', process.env.GITHUB_SECRET)
            .update(JSON.stringify(request.payload))
            .digest('hex');

        // If the signature doesn't match then reject it.
        if (digest !== signature) {
            return reply('Bad Request').code(400)
        }

        var buildLink = request.payload.target_url;
        if (!buildLink) {
            return reply('Build Pending.');
        }

        // List of users to notify
        var toNotify = new Set();
        toNotify.add(request.payload.commit.commit.author.email);
        toNotify.add(request.payload.commit.commit.committer.email)

        var message = request.payload.description;
        var params = { icon_emoji: ':octocat:' };

        switch (request.payload.state) {
            case "pending":
                message = message + " You can follow the build at " + buildLink;
                break;
            case "failure":
                message = message + " For more information check out the build log (" + buildLink +")";
                params.icon_emoji = ':broken_heart:';
                break;
            case "success":
                message = message + " Quick merge it in (or rebase and try again)!"
                params.icon_emoji =':+1:';
                break;
        }

        toNotify.forEach(function (value) {
            if (userMap.has(value)) {
                bot.postMessage(userMap.get(value), message, params);
            }
        });

        reply('Slack notificaiton sent!');
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});