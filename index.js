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
    var nx = 100 + Math.random() * (bound.x1 - 100)
    var ny = 100 + Math.random() * (bound.y1 - 100)
    var p = {name: name, id: socket.id, x:nx , y: ny, rot: -Math.PI / 2, vx: 0, vy: 0, r: 50, kills: 0, killed: 0, health: 100, color: get_random_color(), shoot_countdown: 0}
    players.push(p)

    var text = get_canvas()
    text += get_game_logic()

    socket.emit("change_html", text)
  })

  socket.on('change_input', function(vx, vy, rot) {
    var player = players.filter(obj => {
      return obj.id === socket.id
    })
    player[0] = change_input(player[0], vx, vy, rot)
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

var bound = {x0: 0, y0: 0, x1: 1000, y1: 1000}
var bounciness = 0.75
var players = []
var bullets = []
var shoot_freq = 30
var shoot_force = 10

setInterval(() => {
  if (players.length > 0){
    [players, bullets] = update_map(players, bullets)
    [players, bullets] = move(players, bullets)
    io.sockets.emit('update', players, bullets);
  }
}, 1000 / 60);

function shoot(player){
  player.shoot_countdown = shoot_freq
  var vx = player.vx + Math.cos(player.rot) * shoot_force
  var vy = player.vy + Math.sin(player.rot) * shoot_force
  var bullet = {x: player.x, y: player.y, vx: vx, vy: vy, id: player.id}
  bullets.push(bullet)
}

function get_menu(){
  var menu = `<input id="name_input" placeholder="Name: ">
              <button onclick="socket.emit(\'start_game\', document.getElementById('name_input').value)">Start Game</button>`
  return menu
}

function get_canvas(){
  var canvas = '<canvas id="myCanvas"></canvas>'
  return canvas
}

function move(players, bullets){
  for (var i = 0; i < players.length; i++){
    players[i].x += players[i].vx
    players[i].y += players[i].vy
  }

  for (var i = bullets.length - 1; i >= 0; i--){
    bullets[i].x += bullets[i].vx
    bullets[i].y += bullets[i].vy
    if (bullets[i].x < bound.x0 || bullets[i].x > bound.x1 || bullets[i].y < bound.y0 || bullets[i].y > bound.y1){
      bullets.splice(i, 1)
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
        bullets.splice(i, 1)
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
      bound = {x0: 0, y0: 0, x1: 1000, y1: 1000}

      document.addEventListener('keydown', function(event) {
        if (event.keyCode == "68"){socket.emit('change_input', 0, 0, 1)} //d
        if (event.keyCode == "65"){socket.emit('change_input', 0, 0, -1)} //a
        if (event.keyCode == "87"){socket.emit('change_input', 0, 1, 0)} //w
        if (event.keyCode == "83"){socket.emit('change_input', 0, -1, 0)} //s
        if (event.keyCode == "32"){socket.emit('shoot')} //s
      }, false)

      document.addEventListener('keyup', function(event) {
        socket.emit('change_input', 0, 0, 0)
      }, false)

      socket.on('update', function(players, bullets) {
        ctx.clearRect(0, 0, c.width, c.height)

        var player = players.filter(obj => {
          return obj.id === socket.id
        })

        player = player[0]

        var dx = parseInt(c.width / 2) - player.x
        var dy = parseInt(c.height / 2) - player.y

        border = 200

        for (var i = 0; i < players.length; i++){
          var x = dx + players[i].x
          var y = dy + players[i].y
          if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border){
            draw(x, y, players[i].r, players[i].rot, players[i].color)
            display_player_info(players[i], x, y)
            draw_borders(dx, dy)
          }
        }
        draw_bullets(dx, dy, bullets)
        draw_mini_map(players)
      })

      function draw_bullets(dx, dy, bullets){
        ctx.fillStyle = "black"
        for (var i = 0; i < bullets.length; i++){
          var x = dx + bullets[i].x
          var y = dy + bullets[i].y
          if (x >= 0 && x <= c.width && y >= 0 && y <= c.width){
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill()
          }
        }
      }

      function draw (x, y, r, rot, color){
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2*Math.PI)
        ctx.stroke()

        ctx.globalAlpha = 1.0
        ctx.fillStyle = color
        var path = [[0, 10], [r/2, r/2], [0, -r/2], [-r/2, r/2], [0, 10]]
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
        var w = parseInt(c.width / 6)
        var h = parseInt(c.height / 6)
        ctx.globalAlpha = 1.0
        
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "black"
        ctx.rect(0, 0, w, h);
        ctx.stroke();

        var sx = w / bound.x1
        var sy = h / bound.y1
        for (var i = 0; i < players.length; i++){
          ctx.beginPath();
          ctx.arc(sx * players[i].x, sy * players[i].y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = players[i].color
          ctx.fill()
        }
      }
    </script>`

  return logic
}

function change_input (player, vx, vy, rot){
  player.rot += (rot * 0.3)
  if (vy !== 0){
    //forward
    player.vx += vy * Math.cos(player.rot) * 0.5
    player.vy += vy * Math.sin(player.rot) * 0.5
  }
  return player
}