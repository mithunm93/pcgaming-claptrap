var Firebase = require('firebase');
var request = require('request');
var private = require('./private.js');

var ref = new Firebase(private.firebase_url);

var list;

// helpers
function withinSixMonths(time) {
  return new Date().valueOf() - time < 15552000000;
}

function postString(body) {
  var text = '- ' + body['data']['title'] + ' ';
  text += '[<'+ body['data']['url'] + '|link>]' + '\n';
  return text;
}

function sendToSlack(toSend) {
  var text = { text: toSend };
  request.post(private.slack_url, {body:JSON.stringify(text)});
  console.log("POSTed: " + toSend);
}

var firebaseReadCallback = function (err) {
  if (err)
    console.log("Firebase read failed: " + err.getMessage())
  else
    console.log("Firebase read succeeded");
}

var firebaseWriteCallback = function (err) {
  if (err)
    console.log("Firebase write failed: " + err.getMessage())
  else
    console.log("Firebase write succeeded");
}

// posts to Slack alerting users of game sale that they have requested
function alertUsersOfSale(users, game, text) {
  var toSend = "";

  for (var u in users)
    toSend += '@' + users[u] + ' ';

  toSend += ', ' + game + ' is on sale! Buy it now, minions!' + '\n';
  for (var t in text)
    toSend += postString(text[t]);

  sendToSlack(toSend);
}

function checkGameSaleStatus(user, gameList, game) {
  // Do this because of the async nature of request and because objects are
  // always passed by reference in JS.
  var list = JSON.parse(JSON.stringify(gameList));
  var g = game ? game.valueOf() : null;
  var u = user ? user.valueOf() : null;

  var url  = 'https://www.reddit.com/r/GameDeals/search.json?q=' + g.replace(' ', '+') + '&restrict_sr=on&sort=new&t=week';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('Successfully retrieved search queries for ' + g);

      var bodyJSON = JSON.parse(body);
      var temp;
      var j = 0;
      var toSend = [];

      for (var i=0;i<Math.min(bodyJSON['data']['children'].length, 3);i++) {
        temp = bodyJSON['data']['children'][i]['data']['title'];

        // checks posts' titles to determine if game is on sale
        if (temp.toLowerCase().indexOf(g.toLowerCase()) > -1)
          toSend[j++] = bodyJSON['data']['children'][i];
      }

      if (toSend.length > 0) {
        u = u ? [u] : list[g]['users']
        alertUsersOfSale(u, g, toSend);
        if (!user) {            // only do this if we're acting on data from Firebase
          delete list[g];      // This is super inefficient, but how to sync?
          ref.set(list, firebaseWriteCallback);
        }
      } else if (u) {
        // If this was a sale check triggered by the user
        // and the game was not found on /r/GameDeals
        console.log("Sales for " + g + " not found");
        sendToSlack("I'll keep an eye out for sales on " + g + " and let you know");
        ref.child(g).once('value', function (data) {
          console.log("Firebase read succeded");

          var value = data.val() || { users: { } };
          value['updated_at'] = new Date().valueOf();
          value['users'][u] = 'true';

          ref.child(g).set(value, firebaseWriteCallback);
        }, firebaseReadCallback); //technically this is called on failure, but it still works
      }
    } else
      console.log('ERROR: ' + error);
  });
}

// main functions
function Sales() { }

// Grabs top 5 sales from /r/GameDeals and posts to #ot-pcgaming
// Checks to see if any wishlist games are on sales
Sales.prototype.dailyCheck = function () {
  console.log('Performing daily sales check');

  // TODO: proper way to do this, Job doesn't understand 'this'
  var temp = new Sales();
  temp.getSales();
  temp.checkSales();
}

Sales.prototype.getSales = function () {

  request('https://www.reddit.com/r/GameDeals.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('Successfully retrieved /r/GameDeals');
      var bodyJSON = JSON.parse(body);
      var toSend = "Here are today's sales: \n";

      // grab the top 5 deals from GameDeals
      for (var i=0;i<5;i++)
        toSend += postString(bodyJSON['data']['children'][i]);
      sendToSlack(toSend);
    } else
      console.log('ERROR: ' + error);
  });
}

// Adds a sale check for the user to be notified of later
Sales.prototype.add = function (user, game) {
  checkGameSaleStatus(user, null, game);
}

// checks for sales on all stored games and deletes ones older than 6 months
Sales.prototype.checkSales = function () {
  console.log("Checking sales for games in Firebase");
  ref.once('value', function (data) {
    var games = data.val();

    for (var g in games) {
      if (withinSixMonths(games[g]['updated_at'])) {
        checkGameSaleStatus(Object.keys(games[g]["users"]), games, g);
      } else {
        delete games[g];
        ref.set(games, firebaseWriteCallback);
      }
    }
  }, firebaseReadCallback);
}

module.exports = Sales
