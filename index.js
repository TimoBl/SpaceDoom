//module variables
var app = require('express')();
var path = require("path")
var express = require('express')
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = process.env.PORT || 8000;

//protoypes
function Player(id){
  this.id = id,
  this.x = 3000,
  this.y = 3000,
  this.rot = -Math.PI / 2,
  this.vx = 0,
  this.vy = 0,
  this.health = 100,
  this.input_t = 0
}

function MetaPlayer(id){
  this.id = id,
  this.name = "",
  this.r = 50,
  this.kills = 0,
  this.killed = 0,
  this.asset_index = Math.round(Math.random() * 3),
  this.color = get_random_color(),
  this.input_r = 0,
  this.shoot_force = 10,
  this.speed = 0.1,
  this.rotation_speed = 0.08,
  this.max_speed = 8,
  this.shoot_countdown = 0,
  this.reload_time = 20
}

Player.prototype.shoot = function (meta){
  meta.shoot_countdown = meta.reload_time
  var vx = this.vx + Math.cos(this.rot) * meta.shoot_force
  var vy = this.vy + Math.sin(this.rot) * meta.shoot_force
  var bullet = new Bullet(this.id, this.x, this.y, vx, vy)
  return [bullet, meta]
}

Player.prototype.move = function (limit, meta){
  this.rot += (meta.input_r * meta.rotation_speed)
  this.vx += (this.input_t * Math.cos(this.rot) * meta.speed)
  this.vy += (this.input_t * Math.sin(this.rot) * meta.speed)

  if (this.vx > meta.max_speed){this.vx = meta.max_speed}
  if (this.vx < -meta.max_speed){this.vx = -meta.max_speed}
  if (this.vy > meta.max_speed){this.vy = meta.max_speed}
  if (this.vy < -meta.max_speed){this.vy = -meta.max_speed}

  this.x += this.vx
  this.y += this.vy

  if (this.x - meta.r < limit.x0){
    this.vx = -this.vx * bounciness
    this.x = meta.r + limit.x0 + 1
  }
  if (this.y - meta.r < limit.y0){
    this.vy = -this.vy * bounciness
    this.y = meta.r + limit.y0 + 1
  }

  if (this.x + meta.r > limit.x1){
    this.vx = -this.vx * bounciness
    this.x = -meta.r + limit.x1 - 1
  }
  if (this.y + meta.r > limit.y1){
    this.vy = -this.vy * bounciness
    this.y = -meta.r + limit.y1 - 1
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
  this.type = "Multi"
  this.name = name
  this.limit = {x0: 0, y0: 0, x1: 7680, y1: 4320}
  this.players = []
  this.meta_players = []
  this.bullets = []
  this.asteroids = []
  this.healths = []
  this.asteroids = generate_asteroids(this.asteroids, this.healths, this.limit, 40)
  this.healths = generate_healths(this.asteroids, this.healths, this.limit, 10)
}

MultiGame.prototype.join = function (player, meta_player, socket) {
  this.players.push(player)
  this.meta_players.push(meta_player)
  socket.game_name = this.name
  socket.join(socket.game_name)
  socket.emit("change_html", get_game_html())
  this.meta_update()
  socket.emit("start_game")
}

MultiGame.prototype.update = function (){
  if (this.players.length > 0){
    var items = get_player_collisions(this, this.players, this.meta_players, this.asteroids, this.healths, this.limit)
    this.players = items[0]
    this.healths = items[1]
    var items = get_bullet_collisions(this, this.bullets, this.players, this.meta_players, this.asteroids)
    this.bullets = items[0]
    this.players = items[1]
    for (var i = this.players.length - 1; i >= 0; i--){
      this.players[i].move(this.limit, this.meta_players[i])
      if (this.meta_players[i].shoot_countdown > 0){this.meta_players[i].shoot_countdown -= 1}
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

MultiGame.prototype.meta_update = function (){
  var p = sort_player_list(this.players, this.meta_players)
  this.players = p[0]
  this.meta_players = p[1]
  io.to(this.name).emit("meta_update", this.limit, this.asteroids, this.healths, this.meta_players)
}

function VersusGame(){
  this.type = "Versus"
  this.name = "Versus" + String(parseInt(Math.random() * 1000))
  this.limit = {x0: 1000, y0: 500, x1: 3000, y1: 2500}
  this.players = []
  this.meta_players = []
  this.bullets = []
  this.asteroids = []
  this.healths = []
  this.asteroids = generate_asteroids(this.asteroids, this.healths, this.limit, 10)
  this.healths = generate_healths(this.asteroids, this.healths, this.limit, 3)
}

VersusGame.prototype.join = function (player, meta_player, socket) {
  this.players.push(player)
  this.meta_players.push(meta_player)
  socket.game_name = this.name
  socket.join(socket.game_name)
  if (this.players.length == 2){
    player.x = 1850
    player.y = 600
    meta_player.color = "red"
    meta_player.asset_index = 2
    io.to(this.name).emit("change_html", get_game_html())
    this.meta_update()
    io.to(this.name).emit("start_game")
    waiting_versus_game = null
    games.push(this)
  } else {
    player.x = 700
    player.y = 600
    meta_player.color = "blue"
    meta_player.asset_index = 0
    socket.emit("change_html", "<div id='title_container'><div id='title_vertical_container'><center><h1>Waiting for player...</h1></center></div></div>")
  }
}

VersusGame.prototype.update = function (){
  var items = get_player_collisions(this, this.players, this.meta_players, this.asteroids, this.healths, this.limit)
  this.players = items[0]
  this.healths = items[1]
  var items = get_bullet_collisions(this, this.bullets, this.players, this.meta_players, this.asteroids)
  this.bullets = items[0]
  this.players = items[1]
  for (var i = this.players.length - 1; i >= 0; i--){
    this.players[i].move(this.limit, this.meta_players[i])
    if (this.meta_players[i].shoot_countdown > 0){this.meta_players[i].shoot_countdown -= 1}
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

VersusGame.prototype.meta_update = function (){
  var p = sort_player_list(this.players, this.meta_players)
  this.players = p[0]
  this.meta_players = p[1]
  io.to(this.name).emit("meta_update", this.limit, this.asteroids, this.healths, this.meta_players)
}


//game variables
var bounciness = 0.5

var waiting_versus_game = null

var games = []

app.use('/static', express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html')
})

http.listen(port, function(){
  console.log('listening on: ' + port)
})

io.on('connection', function(socket){
  console.log("New user connected")
  
  var player;
  var meta_player;

  socket.on('init', function(){
    player = new Player(socket.id)
    meta_player = new MetaPlayer(socket.id)
    socket.emit('init_view', player.x, player.y)
  })

  socket.on('init_multi_game', function() {
    socket.emit("change_html", get_multi_page())
  })

  socket.on('init_versus_game', function() {
    socket.emit("change_html", get_versus_page())
  })

  socket.on('join_versus_game', function(name) {
    if (name.length > 0 && name.length <= 8){
      meta_player.name = String(name)
      if (waiting_versus_game == null){
        waiting_versus_game = new VersusGame()
      }
      waiting_versus_game.join(player, meta_player, socket)
    } else {
      socket.emit("error_message", "Invalid name: 1-8 charachters!")
    }
  })

  socket.on('create_multi_game', function(game_name, name) {
    if (game_name.length > 0 && game_name.length <= 8 && name.length > 0 && name.length <= 8){
      meta_player.name = String(name)

      game = new MultiGame(game_name)
      games.push(game)
      game.join(player, meta_player, socket)

    } else if ((game_name.length == 0 || game_name.length > 8) && (name.length == 0 || name.length > 8)){
      socket.emit("error_message", "Invalid names: 1-8 charachters!")
    } else if (game_name.length == 0 || game_name.length > 8){
      socket.emit("error_message", "Invalid game name: 1-8 charachters!")
    } else if (name.length == 0 || name.length > 8){
      socket.emit("error_message", "Invalid name: 1-8 charachters!")
    }
  })
  
  socket.on('join_multi_game', function(game_name, name) {
    game = games.find(x => x.name === game_name)
    if (name.length > 0 && name.length <= 8 && game.players.length <= 6){
      socket.game_name = String(game_name)
      meta_player.name = String(name)
      game.join(player, meta_player, socket)
    } else if (game.players.length > 6){
      socket.emit("error_message", "Game is full!")
    } else {
      socket.emit("error_message", "Invalid name: 1-8 charachters!")
    }
  })

  socket.on('change_rotation_input', function(inp, inp_shift) {
    game = games.find(x => x.name === socket.game_name)
    meta_player = game.meta_players.find(x => x.id === socket.id)
    meta_player.input_r = Math.sign(inp) * Math.min(Math.abs(inp_shift), 1)
  });

  socket.on('change_thrust_input', function(inp, inp_shift) {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    player.input_t = Math.min(Math.abs(inp_shift), 1)
  });

  socket.on('shoot', function() {
    game = games.find(x => x.name === socket.game_name)
    player = game.players.find(x => x.id === socket.id)
    meta_player = game.meta_players.find(x => x.id === socket.id)
    if (meta_player.shoot_countdown == 0){
      var i = player.shoot(meta_player)
      game.bullets.push(i[0])
      meta_player = i[1]
    }
    io.to(game.name).emit("play_shoot_sound")
  });

  socket.on('disconnect', function() {
    game = games.find(x => x.name === socket.game_name)
    if (game) {
      if (game.type == "Multi"){
        game.players = game.players.filter(obj => {
          return obj.id !== socket.id
        })
        game.meta_players = game.meta_players.filter(obj => {
          return obj.id !== socket.id
        })
      } else if (game.type == "Versus"){
        socket.emit("change_html", "reload page...")
        games.splice(games.indexOf(game), 1 )
      }

      game.meta_update()
    }
    console.log("user disconnected")
  });
});

setInterval(() => {
  for (var x = 0; x < games.length; x++){
    games[x].update()
  }
}, 1000 / 60);

function get_player_collisions(game, players, meta_players, asteroids, healths, limit){
  for (var i = players.length - 1; i >= 0; i--){

    //collision to player
    for (var j = players.length - 1; j >= 0; j--){
      if (i != j){
        var p1 = players[i]
        var p2 = players[j]
        var distance = Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y))
        var radius = meta_players[i].r + meta_players[j].r

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
      var radius = meta_players[i].r + a.r
      
      if (distance < radius){
        p.x = ((a.r + meta_players[i].r + 1) * dx / distance) + a.x
        p.y = ((a.r + meta_players[i].r + 1) * dy / distance) + a.y

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
      var radius = meta_players[i].r + a.r
      
      if (distance < radius){
        p.health = 100
        healths.splice(j, 1)
        healths = generate_healths(asteroids, healths, limit, 1)
        game.healths = healths
        game.meta_update()

        return [players, healths]
      }
    }
  }
  return [players, healths]
}

function get_bullet_collisions(game, bullets, players, meta_players, asteroids){
  for (var i = bullets.length - 1; i >= 0; i--){
    //collision with players
    if (bullets[i].state == "shot"){

      for (var j = players.length - 1; j >= 0; j--){
        var b = bullets[i]
        var p = players[j]

        if (p.id != b.id){
        
          var distance = Math.sqrt((p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y))
          var radius = meta_players[j].r + b.r

          if (distance < radius){
            b.state = "exploded"
            p.health -= 25
            io.to(game.name).emit("play_explosion_sound")
            if (p.health <= 0){
              p.health = 100
              meta_players[j].killed += 1
              p_killer = game.meta_players.find(x => x.id === b.id)
              p_killer.kills += 1

              //io.to(p.id).emit("change_html", "hello world!")
              game.meta_players = meta_players 
              game.meta_update()
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

function get_multi_page(){
  var text = "<div id='title_container'><div id='title_vertical_container'><center><div id='input_field'><input id='name_input' placeholder='Name' class='style'>"
  text += "<script type='text/javascript'>socket.on('error_message', function(message) {$('#comment').html(message)})</script>"
  text += "<div style='color:#c11313' id='comment'></div></div><table>"

  text += "<tr><th>Game Name</th><th>Number of Players</th><th></th></tr>"
  for (var x = 0; x < games.length; x++){
    if (games[x].type == "multi"){
      text += `<tr><td>Game` + games[x].name + `</td><td>` + games[x].players.length + `</td><td><button type="button" class='style' onclick="socket.emit('join_multi_game', '` + games[x].name + `', $(\'#name_input\').val())">Join</button></td></tr>`
    }
  }
  text += "</table></center>"
  text += "<form id='game_container'><input id='game_input' class='style' placeholder='Game Name'><button id='game_submit' type='button' class='style' onclick='socket.emit(\"create_multi_game\", $(\"#game_input\").val(), $(\"#name_input\").val())'>New Game</button></form>"
  text += "</div></div>"
  return text
}

function get_versus_page(){
  var text = "<div id='title_container'><div id='title_vertical_container'><center><div id='input_field'><input id='name_input' class='style' placeholder='Name'><button type='button' class='style' onclick='socket.emit(\"join_versus_game\", $(\"#name_input\").val())'>Join</button></form>"
  text += "<script type='text/javascript'>socket.on('error_message', function(message) {$('#comment').html(message)})</script>"
  text += "<div style='color:#c11313' id='comment'></div></div></center></div></div>"
  return text
}

function sort_player_list(players, meta_players){
  for (var i = 0; i < players.length - 1; i++){
    if ((meta_players[i].kills - meta_players[i].killed) < (meta_players[i + 1].kills - meta_players[i + 1].killed)){
      var temp = players[i]
      players[i] = players[i + 1]
      players[i + 1] = temp

      var temp = meta_players[i]
      meta_players[i] = meta_players[i + 1]
      meta_players[i + 1] = temp

    } else if ((meta_players[i].kills - meta_players[i].killed) === (meta_players[i + 1].kills - meta_players[i + 1].killed)){
      if (meta_players[i].kills < meta_players[i].killed){
        var temp = players[i]
        players[i] = players[i + 1]
        players[i + 1] = temp

        var temp = meta_players[i]
        meta_players[i] = meta_players[i + 1]
        meta_players[i + 1] = temp
      }
    }
  }
  return [players, meta_players]
}

function get_random_color(){
  var r = parseInt(Math.random() * 128 + 128).toString()
  var g = parseInt(Math.random() * 128 + 128).toString()
  var b = parseInt(Math.random() * 128 + 128).toString()
  var color = "rgba(" + r + ", " + g + ", " + b + ", 1.0)"
  return color
}

function generate_asteroids(asteroids, healths, limit, n){
  for (var i = n; i > 0; i--){
    var border = 50
    var x = parseInt(limit.x0 + border + (limit.x1 - limit.x0 - 2 * border) * Math.random())
    var y = parseInt(limit.y0 + border + (limit.y1 - limit.y0 - 2 * border) * Math.random())
    var r = 30 + parseInt(Math.random() * 50)
    var a = {x:x, y:y, r:r, asset_index: Math.round(Math.random())}
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