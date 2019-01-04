var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = process.env.PORT || 8000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on: ' + port);
});

io.on('connection', function(socket){
  console.log("New user connected")

  var text = get_menu()
  socket.emit("change_html", text)

  socket.on('start_game', function(name) {
    if (name.length > 0 && name.length <= 10 && players.length <= 6){
      var nx = 100 + Math.random() * (bound.x1 - 100)
      var ny = 100 + Math.random() * (bound.y1 - 100)
      var player = {
        name: name, 
        id: socket.id,
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
        input_t: 0}
      players.push(player)

      var text = get_canvas()
      text += get_game_logic()

      socket.emit("change_html", text)
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
    console.log("User disconnected")
  });
});

var bound = {x0: 0, y0: 0, x1: 2000, y1: 1000}
var bounciness = 0.75
var players = []
var bullets = []
var asteroids = []
var shoot_freq = 30
var shoot_force = 30
var player_speed = 0.1

setInterval(() => {
  if (players.length > 0){
    [players, bullets] = update_map(players, bullets)
    [players, bullets] = move(players, bullets)
    players = sort_player_list(players)
    io.sockets.emit('update', players, bullets);
  }
}, 1000 / 60);


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

function get_menu(){
  var menu = `
    <center>
    <h1>Asteroid Multiplayer Game</h1>
    <i>C'est un premier essai pour mon tm</i><br><br>
    <input id="name_input" placeholder="Name: ">
    <button onclick="socket.emit(\'start_game\', document.getElementById('name_input').value)">Start Game</button>
    </center> `
  return menu
}

function get_canvas(){
  var canvas = `
  <canvas id="myCanvas" style="position: absolute;"></canvas>
  <div id="player_container" style="width: 160px; right: 0px; top: 0px; position: absolute; background-color: rgba(102, 102, 102, 0.5)">
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
    players[i].x += players[i].vx
    players[i].y += players[i].vy
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

function update_map(players, bullets){
  var collided = []

  for (var j = 0; j < players.length; j++){
    for (var i = 0; i < players.length; i++){
      if (j !== i && !(collided.includes(i) && collided.includes(j))){
        var p1 = players[j]
        var p2 = players[i]

        var dx = p1.x - p2.x
        var dy = p1.y - p2.y
        var d = Math.sqrt(dx*dx + dy*dy)
        
        if (d <= (p1.r + p2.r)){

          var cx = ((p1.x * p2.r) + (p2.x * p1.r)) / (p1.r + p2.r);
          var cy = ((p1.y * p2.r) + (p2.y * p1.r)) / (p1.r + p2.r);

          var nvx1 = p2.vx * bounciness
          var nvy1 = p2.vy * bounciness
          var nvx2 = p1.vx * bounciness
          var nvy2 = p1.vy * bounciness
          var damage = parseInt((Math.pow(p1.vx - p2.vx, 2) + Math.pow(p1.vy - p2.vy, 2)))

          players[j].vx = nvx1
          players[j].vy = nvy1

          players[j].health -= damage
          if (players[j].health <= 0){
            players[j].health = 100
            players[j].killed += 1
            players[i].kills += 1
          }

          players[i].vx = nvx2
          players[i].vy = nvy2
          players[i].health -= damage
          if (players[i].health <= 0){
            players[i].health = 100
            players[i].killed += 1
            players[j].kills += 1
          }

          collided.push(j)
          collided.push(i)
        }
      }
    }

    if (players[j].x - players[j].r < bound.x0) {
      players[j].vx = -players[j].vx * bounciness
      players[j].x += 5
    } else if (players[j].x + players[j].r > bound.x1) {
      players[j].vx = -players[j].vx * bounciness
      players[j].x -= 5
    }

    if (players[j].y - players[j].r < bound.y0) {
      players[j].vy = -players[j].vy *bounciness
      players[j].y += 5
    } else if (players[j].y + players[j].r > bound.y1) {
      players[j].vy = -players[j].vy * bounciness
      players[j].y -= 5
    }

    if (players[j].shoot_countdown > 0){
      players[j].shoot_countdown -= 1
    }

    for (var i = bullets.length - 1; i >= 0; i--) {
      if (bullets[i].state == "shot"){
        var d = Math.pow(players[j].x - bullets[i].x, 2) + Math.pow(players[j].y - bullets[i].y, 2)
        if (d < (players[j].r * players[j].r) && bullets[i].id !== players[j].id){
          players[j].health -= 10
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
  }

  return [players, bullets]
}

function get_random_color(){
  var r = parseInt(Math.random() * 128 + 128).toString()
  var g = parseInt(Math.random() * 128 + 128).toString()
  var b = parseInt(Math.random() * 128 + 128).toString()
  var color = "rgba(" + r + ", " + g + ", " + b + ", 1)"
  return color
}

function get_game_logic(){
  var logic = `
    <script type="text/javascript">
      c = $("#myCanvas")[0]
      c.width = window.innerWidth
      c.height = window.innerHeight
      ctx = c.getContext('2d')
      bound = {x0: ${bound.x0}, y0: ${bound.y0}, x1: ${bound.x1}, y1: ${bound.y1}}
      var background_image = new Image()
      background_image.src = "https://www.nasa.gov/sites/default/files/styles/full_width_feature/public/thumbnails/image/potw1838a.jpg"

      document.addEventListener('keydown', function(event) {
        if (event.keyCode == "65"){socket.emit('change_rotation_input', -1)} //a
        if (event.keyCode == "37"){socket.emit('change_rotation_input', -1)} //arrow left

        if (event.keyCode == "68"){socket.emit('change_rotation_input', 1)} //d
        if (event.keyCode == "39"){socket.emit('change_rotation_input', 1)} //arrow right
        
        if (event.keyCode == "87"){socket.emit('change_y_input', 1)} //w
        if (event.keyCode == "38"){socket.emit('change_y_input', 1)} //arrow up

        if (event.keyCode == "32"){socket.emit('shoot')} //shoot
      }, false)

      document.addEventListener('keyup', function(event) {
        if (event.keyCode == "65"){socket.emit('change_rotation_input', 0)} //a
        if (event.keyCode == "37"){socket.emit('change_rotation_input', 0)} //arrow left

        if (event.keyCode == "68"){socket.emit('change_rotation_input', 0)} //d
        if (event.keyCode == "39"){socket.emit('change_rotation_input', 0)} //arrow right
        
        if (event.keyCode == "87"){socket.emit('change_y_input', 0)} //w
        if (event.keyCode == "38"){socket.emit('change_y_input', 0)} //arrow up
      }, false)

      socket.on('update', function(players, bullets) {
        ctx.clearRect(0, 0, c.width, c.height)

        var player = players.filter(obj => {
          return obj.id === socket.id
        })

        player = player[0]

        var dx = parseInt(c.width / 2) - player.x
        var dy = parseInt(c.height / 2) - player.y

        border = 100

        //draw_background(dx, dy, background_image)
        draw_borders(dx, dy)
        draw_bullets(dx, dy, bullets)

        for (var i = 0; i < players.length; i++){
          var x = dx + players[i].x
          var y = dy + players[i].y
          if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border){
            draw(x, y, players[i].r, players[i].rot, players[i].color)
            display_player_info(players[i], x, y)
            if (players[i].input_t !== 0){
              draw_thrust(x, y, players[i].r, players[i].rot)
            }
          }
        }

        draw_mini_map(players)
        display_player_rank(players)
      })

      function draw_background(dx, dy, img){
        ctx.drawImage(img, dx, dy, bound.x1, bound.y1)
      }

      function draw_bullets(dx, dy, bullets){
        ctx.fillStyle = "black"
        for (var i = 0; i < bullets.length; i++){
          var x = dx + bullets[i].x
          var y = dy + bullets[i].y
          if (x >= 0 && x <= c.width && y >= 0 && y <= c.width){
            ctx.beginPath();
            ctx.arc(x, y, bullets[i].r, 0, 2 * Math.PI);
            ctx.lineWidth = 0;
            ctx.fill()
          }
        }
      }

      function draw (x, y, r, rot, color){
        ctx.globalAlpha = 0.4
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2*Math.PI)
        ctx.stroke()

        ctx.globalAlpha = 1.0
        ctx.fillStyle = color
        var path = [[0, 10], [r/2, r/2], [0, -2 * r / 3], [-r/2, r/2], [0, 10]]
        ctx.moveTo(x, y)
        ctx.beginPath() 
        for (var i = 0; i < path.length; i++){
          var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
          var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
          ctx.lineTo(x1, y1)
        }
        ctx.fill()
      }

      function display_player_info(player, x, y){
        //name
        ctx.globalAlpha = 0.8
        ctx.textAlign = "center"; 
        ctx.font = "16px Arial";
        ctx.fillText(player.name, x - player.r, y - player.r);

        //kills
        ctx.fillText(player.kills.toString(), x + player.r, y + player.r);

        //killed
        ctx.fillText(player.killed.toString(), x - player.r, y + player.r);

        //health
        ctx.fillRect(x + 0.5 * player.r, y - 5 * player.r / 4, player.health * player.r / 100, player.r / 4);
        ctx.strokeRect(x + 0.5 * player.r, y - 5 * player.r / 4, player.r, player.r / 4);
      }

      function draw_borders(dx, dy){
        ctx.lineWidth = 3
        ctx.beginPath();
        ctx.moveTo(bound.x0 + dx, bound.y0 + dy);
        ctx.lineTo(bound.x1 + dx, bound.y0 + dy);
        ctx.lineTo(bound.x1 + dx, bound.y1 + dy);
        ctx.lineTo(bound.x0 + dx, bound.y1 + dy);
        ctx.lineTo(bound.x0 + dx, bound.y0 + dy);
        ctx.stroke();
      }

      function draw_mini_map(players){
        var w = parseInt(bound.x1 / 10)
        var h = parseInt(bound.y1 / 10)
        
        ctx.globalAlpha = 1.0
        //ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(102, 102, 102, 0.5)"
        ctx.fillRect(0, 0, w, h);

        var sx = w / bound.x1
        var sy = h / bound.y1
        for (var i = 0; i < players.length; i++){
          ctx.beginPath();
          ctx.arc(sx * players[i].x, sy * players[i].y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = players[i].color
          ctx.fill()
        }
      }

      function draw_thrust(x, y, r, rot){
        ctx.fillStyle = "red"
        ctx.beginPath() 
        var path = [[0, r], [-r/4, r/2], [r/4, r/2]]
        for (var i = 0; i < path.length; i++){
          var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
          var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
          ctx.lineTo(x1, y1)
        }
        ctx.fill()
      }

      function display_player_rank(players){
        var text = "<table><tr><th style='text-align:center'>Player</th><th style='text-align:center'>Kills</th><th style='text-align:center'>Killed</th></tr>"
        for (var i = 0; i < players.length; i++){
          text += "<tr><td style='text-align:center'>" + players[i].name + "</td><td style='text-align:center'>" + players[i].kills.toString() + "</td><td style='text-align:center'>" + players[i].killed.toString() + "</td><tr>"
        }
        text += "</table>"
        $("#player_list").html(text)
      }

      socket.on('disconnect', function() {
        var text = "Reload page..."
        $("body").html(text)
      });
    </script>`

  return logic
}