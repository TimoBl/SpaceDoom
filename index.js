//module variables
var app = require('express')();
var path = require("path")
var express = require('express')
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = process.env.PORT || 8000;

//game variables
var bound = {x0: 0, y0: 0, x1: 2560, y1: 1440}
var bounciness = 0.5
var players = []
var bullets = []
var asteroids = []
var shoot_freq = 20
var shoot_force = 30
var player_speed = 0.1
var max_collision_damage = 30
var max_velocity = 10

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on: ' + port);
});

app.use('/static', express.static(path.join(__dirname, 'public')))

io.on('connection', function(socket){
  console.log("New user connected")

  var text = get_menu()
  socket.emit("change_html", text)

  socket.on('init_game', function(name) {
    if (name.length > 0 && name.length <= 10 && players.length <= 6){
      player = get_new_player(name, socket.id)
      players.push(player)

      var text = get_canvas()
      text += '<script src="static/client.js"></script>'
      socket.emit("change_html", text)
      socket.emit("start_game", bound, asteroids)
      io.sockets.emit("update_stats", players)
    }
  })

  socket.on('change_rotation_input', function(rot) {
    var player = players.filter(obj => {
      return obj.id === socket.id
    })
    player[0].input_r = rot
  });

  socket.on('change_y_input', function(inp) {
    var player = players.filter(obj => {
      return obj.id === socket.id
    })
    player[0].input_t = inp
  });

  socket.on('shoot', function() {
    var player = players.filter(obj => {
      return obj.id === socket.id
    })
    if (player[0].shoot_countdown == 0){
      shoot(player[0])
    } 
  });

  socket.on('disconnect', function() {
    players = players.filter(obj => {
      return obj.id !== socket.id
    })
  });
});

init_map()

setInterval(() => {
  if (players.length > 0){
    a = update_map(players, bullets, asteroids)
    players = a[0]
    bullets = a[1]
    asteroids = a[2]
    a = move(players, bullets)
    players = a[0]
    bullets = a[1]
    io.sockets.emit('update', players, bullets);
  }
}, 1000 / 60);


function init_map(){
  var ast = {x: 400, y: 300, r: 60, ir: 120}
  asteroids.push(ast)

  var ast = {x: 1000, y: 1000, r: 120, ir: 300}
  asteroids.push(ast)

  var ast = {x: 1600, y: 800, r: 40, ir: 80}
  asteroids.push(ast)

  var ast = {x: 1300, y: 1200, r: 50, ir: 140}
  asteroids.push(ast)
}

function get_new_player(name, id){
  var nx = 100 + Math.random() * (bound.x1 - 100)
  var ny = 100 + Math.random() * (bound.y1 - 100)
  var player = {
    name: name, 
    id: id,
    x:nx , y: ny, 
    rot: -Math.PI / 2, 
    vx: 0, vy: 0, 
    r: 50, 
    kills: 0, 
    killed: 0, 
    health: 100, 
    color: get_random_color(), 
    shoot_countdown: 0, 
    input_r: 0,
    input_t: 0
  }
  return player
}

function shoot(player){
  player.shoot_countdown = shoot_freq
  var vx = player.vx + Math.cos(player.rot) * shoot_force
  var vy = player.vy + Math.sin(player.rot) * shoot_force
  var bullet = {
    x: player.x, y: player.y, 
    r:5, vx: vx, vy: vy, 
    id: player.id, state:"shot"}
  bullets.push(bullet)
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

function get_asteroids(){
  var text = "["
  for (var i = 0; i < asteroids.length; i++){
    var a = asteroids[i]
    var t = `{x: ${a.x}, y: ${a.y}, r: ${a.r}, ir: ${a.ir}}`
    text += t
    if (i < asteroids.length - 1){text += ","}
  }
  text += "]"
  return text
}

function get_menu(){
  var menu = `
    <center>
    <h1>Asteroid Multiplayer Game</h1>
    <i>C'est un premier essai pour mon tm</i><br><br>
    <input id="name_input" placeholder="Name: ">
    <button onclick="socket.emit(\'init_game\', document.getElementById('name_input').value)">Start Game</button>
    <br>
    <br>
    <br>
    <b>Les commandes</b>
    <br>
    <br>
    [w] ou [upArrow] = avancer
    <br>
    <br>
    [a] ou [leftArrow] = tourner à gaucher
    <br>
    <br>
    [d] ou [rightArrow] = tourner à droite
    <br>
    <br>
    [shift] = permet de ralentir la rotation afin de mieux viser
    <br>
    <br>
    [spacebar] = tirer
    <br>
    <br>
    <br>
    <b>Les instructions</b>
    <br>
    <br>
    Détruire l'autre...
    <br>
    <br>
    <br>
    <i><b>Bon jeu!</b></i>
    <br>
    <br>
    P.S Les suggestions/critiques sont le bienvenu
    <br>
    <br>
    <br>
    <i>Timo Blattner</i>
    </center> `
  return menu
}

function get_canvas(){
  var canvas = `
  <canvas id="backCanvas" style="position: absolute; z-index: 0;"></canvas>
  <canvas id="myCanvas" style="position: absolute; z-index: 1;"></canvas>
  <canvas id="shaderCanvas" style="position: absolute; z-index: 2;"></canvas>
  <div id="player_container" style="width: 160px; right: 10px; top: 10px; position: absolute; background-color: rgba(102, 102, 102, 0.5)">
    <div id="player_list" style="color: white; margin: 5px"></div>
  </div>
  `
  return canvas
}

function move(players, bullets){
  for (var i = 0; i < players.length; i++){
    players[i].rot += (players[i].input_r / 10)
    players[i].vx += players[i].input_t * Math.cos(players[i].rot) * player_speed
    players[i].vy += players[i].input_t * Math.sin(players[i].rot) * player_speed
    if (players[i].vx > max_velocity){players[i].vx = max_velocity}
    if (players[i].vy > max_velocity){players[i].vy = max_velocity}
    if (players[i].vx < -max_velocity){players[i].vx = -max_velocity}
    if (players[i].vy < -max_velocity){players[i].vy = -max_velocity}
    players[i].x += players[i].vx
    players[i].y += players[i].vy
    if (players[i].health < 100){
      players[i].health += 0.05
    } else {
      players[i].health = 100
    }
  }

  for (var i = bullets.length - 1; i >= 0; i--){
    if (bullets[i].state == "shot"){
      bullets[i].x += bullets[i].vx
      bullets[i].y += bullets[i].vy
      if (bullets[i].x < bound.x0 || bullets[i].x > bound.x1 || bullets[i].y < bound.y0 || bullets[i].y > bound.y1){
        bullets.splice(i, 1)
      }
    } else if (bullets[i].state == "exploded") {
      bullets[i].r += 0.5
      if (bullets[i].r > 10){
        bullets.splice(i, 1)
      }
    }
  }
  return [players, bullets]
}

function update_map(players, bullets, asteroids){
  var collided = []

  var a = get_map_collision(bullets, asteroids)
  bullets = a[0]
  asteroids = a[1]

  for (var j = 0; j < players.length; j++){
    var a = get_collision_to(j, players, collided)
    players = a[0]
    collided = a[1]
    players[j] = get_border_collision(players[j])

    var a = get_bullet_collision(j, players, bullets)
    players = a[0]
    bullets = a[1]

    var a = get_asteroid_collision(players[j], asteroids)
    players[j] = a[0]
    asteroids = a[1]

    if (players[j].shoot_countdown > 0){
      players[j].shoot_countdown -= 1
    }

    if (players[j].health <= 0){
      players[j].health = 100
      players[j].killed += 1
      players = sort_player_list(players)
      io.sockets.emit('update_stats', players)
    }
  }
  return [players, bullets, asteroids]
}

function get_map_collision(bullets, asteroids){
  for (var j = 0; j < asteroids.length; j++){
    for (var i = bullets.length - 1; i >= 0; i--) {
      var d = parseInt(Math.sqrt(Math.pow(bullets[i].x - asteroids[j].x, 2) + Math.pow(bullets[i].y - asteroids[j].y, 2)))
      if (d < asteroids[j].r + bullets[i].r){
        bullets.splice(i, 1)
      }
    }
  }
  return [bullets, asteroids]
}

function get_collision_to(j, players, collided){
  for (var i = 0; i < players.length; i++){
    if (j !== i && !(collided.includes(i) && collided.includes(j))){
      var p1 = players[j]
      var p2 = players[i]

      var dx = p1.x - p2.x
      var dy = p1.y - p2.y
      var d = Math.sqrt(dx*dx + dy*dy)
      
      if (d <= (p1.r + p2.r)){

        var cx = ((p1.x * p2.r) + (p2.x * p1.r)) / (p1.r + p2.r) //collision point x
        var cy = ((p1.y * p2.r) + (p2.y * p1.r)) / (p1.r + p2.r) //collision point y

        var nvx1 = p2.vx * bounciness
        var nvy1 = p2.vy * bounciness

        var nvx2 = p1.vx * bounciness
        var nvy2 = p1.vy * bounciness
        
        var damage = Math.min(parseInt((Math.pow(p1.vx - p2.vx, 2) + Math.pow(p1.vy - p2.vy, 2))), max_collision_damage)

        var nx1 = cx + (p1.r + p2.r) * dx / d
        var ny1 = cy + (p1.r + p2.r) * dy / d
        var nx2 = cx - (p1.r + p2.r) * dx / d
        var ny2 = cy - (p1.r + p2.r) * dy / d

        p1.x = nx1
        p1.y = ny1
        p1.vx = nvx1
        p1.vy = nvy1

        p2.x = nx2
        p2.y = ny2
        p2.vx = nvx2
        p2.vy = nvy2

        p1.health -= damage
        if (p1.health <= 0){
          p1.health = 100
          p1.killed += 1
          p2.kills += 1
          players = sort_player_list(players)
          io.sockets.emit('update_stats', players)
        }

        p2.health -= damage
        if (p1.health <= 0){
          p2.health = 100
          p2.killed += 1
          p1.kills += 1
          players = sort_player_list(players)
          io.sockets.emit('update_stats', players)
        }

        collided.push(j)
        collided.push(i)
      }
    }
  }
  return [players, collided]
}

function get_border_collision(p){
  if (p.x - p.r < bound.x0) {
    p.vx = -p.vx * bounciness
    p.x += 5
  } else if (p.x + p.r > bound.x1) {
    p.vx = -p.vx * bounciness
    p.x -= 5
  }

  if (p.y - p.r < bound.y0) {
    p.vy = -p.vy * bounciness
    p.y += 5
  } else if (p.y + p.r > bound.y1) {
    p.vy = -p.vy * bounciness
    p.y -= 5
  }
  return p
}

function get_bullet_collision(j, players, bullets){
  for (var i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].state == "shot"){
      var d = Math.pow(players[j].x - bullets[i].x, 2) + Math.pow(players[j].y - bullets[i].y, 2)
      if (d < (players[j].r * players[j].r) && bullets[i].id !== players[j].id){
        players[j].health -= 50
        if (players[j].health <= 0){
          players[j].health = 100
          var player = players.filter(obj => {
            return obj.id === bullets[i].id
          })
          players[j].killed += 1
          player[0].kills += 1
        }
        bullets[i].state = "exploded"
      }
    }
  }
  return [players, bullets]
}

function get_asteroid_collision(p, asteroids){
  for (var i = 0; i < asteroids.length; i++){
    var d = parseInt(Math.sqrt(Math.pow(p.x - asteroids[i].x, 2) + Math.pow(p.y - asteroids[i].y, 2)))
    var dx = p.x - asteroids[i].x
    var dy = p.y - asteroids[i].y 
    
    if (d <= (p.r + asteroids[i].r)){
      p.x = ((asteroids[i].r + p.r) * dx / d) + asteroids[i].x
      p.y = ((asteroids[i].r + p.r) * dy / d) + asteroids[i].y

      p.vx = -9 * p.vx / 10
      p.vy = -9 * p.vy / 10

      var damage = parseInt((Math.pow(p.vx, 2) + Math.pow(p.vy, 2)))
      p.health -= Math.min(damage, max_collision_damage)
    } else if (d < (p.r + asteroids[i].ir)){
      let dx = asteroids[i].x - p.x 
      let dy = asteroids[i].y - p.y
      p.vx += (0.05 * dx / d)
      p.vy += (0.05 * dy / d)
    }
  }
  return [p, asteroids]
}

function get_random_color(){
  var r = parseInt(Math.random() * 128 + 128).toString()
  var g = parseInt(Math.random() * 128 + 128).toString()
  var b = parseInt(Math.random() * 128 + 128).toString()
  var color = "rgba(" + r + ", " + g + ", " + b + ", 1)"
  return color
}
    