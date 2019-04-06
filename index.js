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

Player.prototype.move = function (limit){
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
  this.limit = {x0: 0, y0: 0, x1: 7680, y1: 4320}
  this.players = []
  this.bullets = []
  this.asteroids = []
  this.healths = []
  this.asteroids = generate_asteroids(this.asteroids, this.healths, this.limit, 40)
  this.healths = generate_healths(this.asteroids, this.healths, this.limit, 10)
}

MultiGame.prototype.join = function (player, socket) {
  this.players.push(player)
  socket.game_name = this.name
  socket.join(socket.game_name)
  socket.emit("change_html", get_game_html())
  socket.emit("start_game", this.asteroids, this.limit)
  socket.emit("update_map", this.limit, this.asteroids, this.healths)
  socket.emit("update_stats", this.players)
}

MultiGame.prototype.update = function (){
  if (this.players.length > 0){
    var items = get_player_collisions(this.name, this.players, this.asteroids, this.healths, this.limit)
    this.players = items[0]
    this.healths = items[1]
    var items = get_bullet_collisions(this.name, this.bullets, this.players, this.asteroids)
    this.bullets = items[0]
    this.players = items[1]
    for (var i = this.players.length - 1; i >= 0; i--){
      this.players[i].move(this.limit)
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

function VersusGame(){
  this.name = "Versus" + String(parseInt(Math.random() * 1000))
  this.limit = {x0: 1000, y0: 500, x1: 3000, y1: 2500}
  this.players = []
  this.bullets = []
  this.asteroids = []
  this.healths = []
  this.asteroids = generate_asteroids(this.asteroids, this.healths, this.limit, 10)
  this.healths = generate_healths(this.asteroids, this.healths, this.limit, 3)
}

VersusGame.prototype.join = function (player, socket) {
  this.players.push(player)
  socket.game_name = this.name
  socket.join(socket.game_name)
  if (this.players.length == 2){
    player.x = 1850
    player.y = 600
    player.color = "red"
    io.to(this.name).emit("change_html", get_game_html())
    io.to(this.name).emit("start_game", this.asteroids, this.limit)
    io.to(this.name).emit("update_map", this.limit, this.asteroids, this.healths)
    io.to(this.name).emit("update_stats", this.players)
    waiting_versus_game = null
    games.push(this)
  } else {
    player.x = 700
    player.y = 600
    player.color = "blue"
    socket.emit("change_html", "<div id='title_container'><div id='title_vertical_container'><center><h1>Waiting for player...</h1></center></div></div>")
  }
}

VersusGame.prototype.update = function (){
  var items = get_player_collisions(this.name, this.players, this.asteroids, this.healths, this.limit)
  this.players = items[0]
  this.healths = items[1]
  var items = get_bullet_collisions(this.name, this.bullets, this.players, this.asteroids)
  this.bullets = items[0]
  this.players = items[1]
  for (var i = this.players.length - 1; i >= 0; i--){
    this.players[i].move(this.limit)
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


//game variables
var bounciness = 0.5
var shoot_freq = 20
var shoot_force = 10
var player_speed = 0.08
var rotation_speed = 0.08

var waiting_versus_game = null

var games = []

app.use('/static', express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/blog', function(req, res){
  res.send('A list of blog posts should go here');
});

http.listen(port, function(){
  console.log('listening on: ' + port);
});

io.on('connection', function(socket){
  console.log("New user connected")
  
  var player;

  socket.on('init', function(){
    player = new Player(socket.id)
    socket.emit('init_view', player.x, player.y)
  })

  socket.on('init_open_world_game', function() {
    socket.emit("change_html", get_game_list())
  })

  socket.on('init_versus_game', function() {
    socket.emit("change_html", "<div id='title_container'><div id='title_vertical_container'><center><form id='game_container'><input id='name_input' class='style' placeholder='Name'><button type='button' class='style' onclick='socket.emit(\"join_versus_game\", $(\"#name_input\").val())'>Join</button></form></center></div></div>")
  })

  socket.on('join_versus_game', function(name) {
    if (name.length > 0 && name.length <= 8){
      player.name = String(name)
      if (waiting_versus_game == null){
        waiting_versus_game = new VersusGame()
      }
      waiting_versus_game.join(player, socket)
    }
  })

  socket.on('create_multi_game', function(game_name, name) {
    if (game_name.length > 0 && game_name.length <= 8 && name.length > 0 && name.length <= 8){
      player.name = String(name)

      game = new MultiGame(game_name)
      games.push(game)

      game.join(player, socket)
    }
  })
  
  socket.on('join_multi_game', function(game_name, name) {
    socket.game_name = String(game_name)

    game = games.find(x => x.name === socket.game_name)
    if (name.length > 0 && name.length <= 8 && game.players.length <= 6){
      player.name = String(name)
      game.join(player, socket)
    }
  })

  socket.on('change_rotation_input', function(inp, inp_shift) {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    player.input_r = Math.sign(inp) * Math.min(Math.abs(inp_shift), 1)
  });

  socket.on('change_thrust_input', function(inp, inp_shift) {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    player.input_t = Math.min(Math.abs(inp_shift), 1)
  });

  socket.on('shoot', function() {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    if (player.shoot_countdown == 0){
      game.bullets.push(player.shoot())
    }
    io.to(game.name).emit("play_shoot_sound")
  });

  socket.on('disconnect', function() {
    game = games.find(x => x.name === socket.game_name)
    if (game) {
      game.players = game.players.filter(obj => {
        return obj.id !== socket.id
      })
      game.players = sort_player_list(game.players)
      io.to(game.name).emit("update_stats", game.players)
    }
    console.log("user disconnected")
  });
});

setInterval(() => {
  for (var x = 0; x < games.length; x++){
    games[x].update()
  }
}, 1000 / 60);

function get_player_collisions(game_name, players, asteroids, healths, limit){
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
          return [players, healths]
        }
      }
    }

    var p = players[i]

    //collision to asteroids
    for (var j = asteroids.length - 1; j >= 0; j--){
      var a = asteroids[j]

      var dx = p.x - a.x
      var dy = p.y - a.y 

      var distance = parseInt(Math.sqrt(dx * dx + dy * dy))
      var radius = p.r + a.r
      
      if (distance < radius){
        p.x = ((a.r + p.r + 1) * dx / distance) + a.x
        p.y = ((a.r + p.r + 1) * dy / distance) + a.y

        p.vx = -5 * p.vx / 10
        p.vy = -5 * p.vy / 10
        return [players, healths]
      }
    }

    //collision to healths
    for (var j = healths.length - 1; j >= 0; j--){
      var a = healths[j]

      var dx = p.x - a.x
      var dy = p.y - a.y 

      var distance = parseInt(Math.sqrt(dx * dx + dy * dy))
      var radius = p.r + a.r
      
      if (distance < radius){
        p.health = 100
        healths.splice(j, 1)
        healths = generate_healths(asteroids, healths, limit, 1)
        io.to(game_name).emit("update_map", limit, asteroids, healths)
        return [players, healths]
      }
    }
  }
  return [players, healths]
}

function get_bullet_collisions(game_name, bullets, players, asteroids){
  for (var i = bullets.length - 1; i >= 0; i--){
    //collision with players
    if (bullets[i].state == "shot"){

      for (var j = players.length - 1; j >= 0; j--){
        var b = bullets[i]
        var p = players[j]

        if (p.id != b.id){
        
          var distance = Math.sqrt((p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y))
          var radius = p.r + b.r

          if (distance < radius){
            b.state = "exploded"
            p.health -= 25
            io.to(game_name).emit("play_explosion_sound")
            if (p.health <= 0){
              p.health = 100
              p.killed += 1
              p_killer = game.players.find(x => x.id === b.id)
              p_killer.kills += 1
              players = sort_player_list(players)
              io.to(game_name).emit("update_stats", players)
            }
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
          bullets[i].state = "exploded"
          return [bullets, players]
        }
      }
    } else {
      if (bullets[i].r >= 10){bullets.splice(i, 1)}
    }
  }
  return [bullets, players]
}

function get_game_html(){
  var text = '<img src="static/images/menu.png" onclick="window.location.href = window.location.href" style="position: absolute; cursor: pointer; width: 40px; height: 40px; top: 10px; right: 10px; z-index: 3;">'
  text += '<div id="player_list" style="position: absolute; top: 60px; right: 0px; width: 20%; z-index: 3;"></div>'
  return text
}

function get_game_list(){
  var text = "<div id='title_container'><div id='title_vertical_container'><center><input id='name_input' placeholder='Name' class='style'><table style='z-index: 3;'>"
  text += "<tr><th>Game Name</th><th>Number of Players</th><th>Join</th></tr>"
  for (var x = 0; x < games.length; x++){
    text += `<tr><td>Game` + games[x].name + `</td><td>` + games[x].players.length + `</td><td><button type="button" class='style' onclick="socket.emit('join_multi_game', '` + games[x].name + `', $(\'#name_input\').val())">Join</button></td></tr>`
  }
  text += "</table></center>"
  text += "<form id='game_container'><input id='game_input' class='style' placeholder='Game Name'><button id='game_submit' type='button' class='style' onclick='socket.emit(\"create_multi_game\", $(\"#game_input\").val(), $(\"#name_input\").val())'>New Game</button></form>"
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

function generate_asteroids(asteroids, healths, limit, n){
  for (var i = n; i > 0; i--){
    var border = 50
    var x = parseInt(limit.x0 + border + (limit.x1 - limit.x0 - 2 * border) * Math.random())
    var y = parseInt(limit.y0 + border + (limit.y1 - limit.y0 - 2 * border) * Math.random())
    var r = 30 + parseInt(Math.random() * 50)
    var a = {x:x, y:y, r:r, n: Math.round(Math.random())}
    var y = true
    for (var j = 0; j < asteroids.length; j++){
      var b = asteroids[j]
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r
      if (distance < 2 * radius){
        y = false
        break
      } 
    }

    for (var j = 0; j < healths.length; j++){
      var b = healths[j]
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r
      if (distance < radius){
        y = false
        break
      } 
    }

    if (y == true){
      asteroids.push(a)
    } else {
      i -= 1
    }
  }
  return asteroids
}

function generate_healths(asteroids, healths, limit, n){
  for (var i = n; i > 0; i--){
    var border = 10
    var x = parseInt(limit.x0 + border + (limit.x1 - limit.x0 - 2 * border) * Math.random())
    var y = parseInt(limit.y0 + border + (limit.y1 - limit.y0 - 2 * border) * Math.random())
    var r = 40
    var a = {x:x, y:y, r:r}
    var y = true
    for (var j = 0; j < asteroids.length; j++){
      var b = asteroids[j]
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r
      if (distance < 2 * radius){
        y = false
        break
      } 
    }

    for (var j = 0; j < healths.length; j++){
      var b = healths[j]
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
      var radius = a.r + b.r
      if (distance < radius){
        y = false
        break
      } 
    }

    if (y == true){
      healths.push(a)
    } else {
      i -= 1
    }
  }
  return healths
}
    