//module variables
var app = require('express')();
var path = require("path")
var express = require('express')
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = process.env.PORT || 8000;

//protoypes
function Player(id){
  this.name = "",
  this.id = id,
  this.x = 1000,
  this.y = 500,
  this.rot = -Math.PI / 2,
  this.vx = 0,
  this.vy = 0,
  this.r = 50,
  this.kills = 0,
  this.killed = 0,
  this.health = 100,
  this.color = get_random_color(),
  this.shoot_countdown = 0,
  this.input_r = 0,
  this.input_t = 0
}

Player.prototype.shoot = function (){
  this.shoot_countdown = shoot_freq
  var vx = this.vx + Math.cos(this.rot) * shoot_force
  var vy = this.vy + Math.sin(this.rot) * shoot_force
  var bullet = new Bullet(this.id, this.x, this.y, vx, vy)
  return bullet
}

Player.prototype.move = function (){
  if (this.shoot_countdown > 0){
    this.shoot_countdown -= 1
  }
  
  this.rot += (this.input_r * rotation_speed)

  this.vx += (this.input_t * Math.cos(this.rot) * player_speed)
  this.vy += (this.input_t * Math.sin(this.rot) * player_speed)

  this.x += this.vx
  this.y += this.vy

  if (this.x - this.r < limit.x0){
    this.vx = -this.vx * bounciness
    this.x = this.r + limit.x0 + 1
  }
  if (this.y - this.r < limit.y0){
    this.vy = -this.vy * bounciness
    this.y = this.r + limit.y0 + 1
  }

  if (this.x + this.r > limit.x1){
    this.vx = -this.vx * bounciness
    this.x = -this.r + limit.x1 - 1
  }
  if (this.y + this.r > limit.y1){
    this.vy = -this.vy * bounciness
    this.y = -this.r + limit.y1 - 1
  }
}

function Bullet(id, x, y, vx, vy){
  this.id = id,
  this.x = x,
  this.y = y,
  this.vx = vx,
  this.vy = vy,
  this.r = 5,
  this.state = "shot"
}

Bullet.prototype.move = function (index){
  if (this.state == "shot"){
    this.x += this.vx
    this.y += this.vy
  } else if (this.state == "exploded") {
    this.r += 0.5
  }
}

function MultiGame(name){
  this.name = name
  this.limit = {x0: 0, y0: 0, x1: 2560, y1: 1440}
  this.players = []
  this.bullets = []
  this.asteroids = generate_map(this.limit, 40)
}

MultiGame.prototype.update = function (){
  if (this.players.length > 0){
    this.players = get_player_collisions(this.players, this.asteroids)
    var items = get_bullet_collisions(this.bullets, this.players, this.asteroids)
    this.bullets = items[0]
    this.players = items[1]
    for (var i = this.players.length - 1; i >= 0; i--){
      this.players[i].move()
    }
    for (var i = this.bullets.length - 1; i >= 0; i--){
      var b = this.bullets[i]
      b.move(i)
      if (b.r > 10 || b.x - b.r < this.limit.x0 || b.y - b.r < this.limit.y0 || b.x + b.r > this.limit.x1 || b.y + b.r > this.limit.y1){
        this.bullets.splice(i, 1)
      }
    }
    io.to(this.name).emit('update', this.players, this.bullets)
  }
}

//game variables
var limit = {x0: 0, y0: 0, x1: 2560, y1: 1440}
var bounciness = 0.5
var shoot_freq = 20
var shoot_force = 10
var player_speed = 0.1
var rotation_speed = 0.1

var games = []

app.get('/', function(req, res){
  res.sendFile(__dirname + '/start.html');
});

http.listen(port, function(){
  console.log('listening on: ' + port);
});

app.use('/static', express.static(path.join(__dirname, 'public')))

io.on('connection', function(socket){
  console.log("New user connected")
  
  var player;

  socket.on('init', function(){
    player = new Player(socket.id)
    socket.emit('init_view', limit, player.x, player.y)
  })

  socket.on('init_open_world_game', function() {
    socket.emit("change_html", get_game_list())
  })

  socket.on('create_game', function(game_name, name) {
    if (game_name.length > 0 && game_name.length <= 8 && name.length > 0 && name.length <= 8){
      socket.game_name = String(game_name)

      game = new MultiGame(socket.game_name)
      game.players.push(player)
      games.push(game)

      player.name = name

      socket.join(socket.game_name)
      socket.emit("change_html", get_game_html())
      socket.emit("start_game", game.asteroids)
      socket.emit("update_stats", game.players)
    }
  })
  
  socket.on('init_game', function(game_name, name) {
    socket.game_name = String(game_name)

    game = games.find(x => x.name === socket.game_name)
    if (name.length > 0 && name.length <= 8 && game.players.length <= 6){
      player.name = name
      game.players.push(player)

      socket.join(socket.game_name)
      socket.emit("change_html", get_game_html())
      socket.emit("start_game", game.asteroids)
      io.to(game_name).emit("update_stats", game.players)
    }
  })

  socket.on('change_rotation_input', function(rot) {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    player.input_r = rot
  });

  socket.on('change_thrust_input', function(inp) {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    player.input_t = inp
  });

  socket.on('shoot', function() {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    if (player.shoot_countdown == 0){
      game.bullets.push(player.shoot())
    }
  });

  socket.on('disconnect', function() {
    game = games.find(x => x.name === socket.game_name)
    if (game) {
      game.players = game.players.filter(obj => {
        return obj.id !== socket.id
      })
    }
    console.log("user disconnected")
  });
});

setInterval(() => {
  for (var x = 0; x < games.length; x++){
    games[x].update()
  }
}, 1000 / 60);

function get_player_collisions(players, asteroids){
  for (var i = players.length - 1; i >= 0; i--){

    //collision to player
    for (var j = players.length - 1; j >= 0; j--){
      if (i != j){
        var p1 = players[i]
        var p2 = players[j]
        var distance = Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y))
        var radius = p1.r + p2.r

        if (distance <= radius){
          //inverse vectors
          var nvx1 = p2.vx
          var nvy1 = p2.vy
          p2.vx = p1.vx
          p2.vy = p1.vy
          p1.vx = nvx1
          p1.vy = nvy1
          return players
        }
      }
    }

    //collision to asteroids
    var p = players[i]

    for (var j = asteroids.length - 1; j >= 0; j--){
      var a = asteroids[j]

      var dx = p.x - a.x
      var dy = p.y - a.y 

      var distance = parseInt(Math.sqrt(dx * dx + dy * dy))
      var radius = p.r + a.r
      
      if (distance < radius){
        p.x = ((a.r + p.r + 1) * dx / distance) + a.x
        p.y = ((a.r + p.r + 1) * dy / distance) + a.y

        p.vx = -7 * p.vx / 10
        p.vy = -7 * p.vy / 10
        return players
      }
    }
  }
  return players
}

function get_bullet_collisions(bullets, players, asteroids){
  for (var i = bullets.length - 1; i >= 0; i--){
    //collision with players
    for (var j = players.length - 1; j >= 0; j--){
      var b = bullets[i]
      var p = players[j]

      if (p.id != b.id){
      
        var distance = Math.sqrt((p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y))
        var radius = p.r + b.r

        if (distance < radius){
          bullets.splice(i, 1)
          p.health -= 50
          return [bullets, players]
        }
      }
    }

    //collision with asteroids
    for (var j = asteroids.length - 1; j >= 0; j--){
      var b = bullets[i]
      var a = asteroids[j]
      
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r

      if (distance < radius){
        bullets.splice(i, 1)
        return [bullets, players]
      }
    }
  }
  return [bullets, players]
}

function get_game_html(){
  var text = '<img src="static/menu.png" onclick="location.reload()" style="position: absolute; cursor: pointer; width: 50px; height: 50px; top: 10px; right: 10px; z-index: 3;">'
  return text
}

function get_game_list(){
  var text = "<div id='title_container'><div id='title_vertical_container'><center><input id='name_input' placeholder='Name' class='style'><table style='z-index: 3;'>"
  text += "<tr><th>Game Name</th><th>Number of Players</th><th>Join</th></tr>"
  for (var x = 0; x < games.length; x++){
    text += `<tr><td>Game` + games[x].name + `</td><td>` + games[x].players.length + `</td><td><button type="button" class='style' onclick="socket.emit('init_game', '` + games[x].name + `', $(\'#name_input\').val())">Join</button></td></tr>`
  }
  text += "</table></center>"
  text += "<form id='game_container'><input id='game_input' class='style' placeholder='Game Name'><button id='game_submit' type='button' class='style' onclick='socket.emit(\"create_game\", $(\"#game_input\").val(), $(\"#name_input\").val())'>New Game</button></form>"
  text += "</div></div>"
  return text
}

function sort_player_list(players){
  for (var i = 0; i < players.length - 1; i++){
    if ((players[i].kills - players[i].killed) < (players[i + 1].kills - players[i + 1].killed)){
      var temp = players[i]
      players[i] = players[i + 1]
      players[i + 1] = temp
    } else if ((players[i].kills - players[i].killed) === (players[i + 1].kills - players[i + 1].killed)){
      if (players[i].kills < players[i].killed){
        var temp = players[i]
        players[i] = players[i + 1]
        players[i + 1] = temp
      }
    }
  }
  return players
}

function get_random_color(){
  var r = parseInt(Math.random() * 128 + 128).toString()
  var g = parseInt(Math.random() * 128 + 128).toString()
  var b = parseInt(Math.random() * 128 + 128).toString()
  var color = "rgba(" + r + ", " + g + ", " + b + ", 1)"
  return color
}

function generate_map(limit, n){
  var asteroids = []
  for (var i = n; i > 0; i--){
    var border = 20
    var x = parseInt(limit.x0 + border + (limit.x1 - limit.x0 - 2 * border) * Math.random())
    var y = parseInt(limit.y0 + border + (limit.y1 - limit.y0 - 2 * border) * Math.random())
    var r = 20 + parseInt(Math.random() * 30)
    var asteroid = {x:x, y:y, r:r}
    var y = true
    for (var j = 0; j < asteroids.length; j++){
      var a = asteroid
      var b = asteroids[j]
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r
      if (distance < 2 * radius){
        y = false
        break
      } 
    }

    if (y == true){
      asteroids.push(asteroid)
    } else {
      i -= 1
    }
  }
  return asteroids
}

    