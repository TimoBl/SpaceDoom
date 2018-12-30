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

setInterval(() => {
  if (players.length > 0){
    io.sockets.emit('update', players);
  }
}, 1000 / 60);

io.on('connection', function(socket){
  console.log("New user connected")

  var text = get_menu()
  socket.emit("change_html", text)

  socket.on('start_game', function(name) {
    var p = {name: name, id: socket.id, x: 0, y: 0, rot: 0, vx: 0, vy: 0, r: 50, kills: 0, killed: 0, health: 100}
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

  socket.on('disconnect', function() {
    players = players.filter(obj => {
      return obj.id !== socket.id
    })
    console.log("User disconnected")
  });
});


var players = []

function get_menu(){
  var menu = `<input id="name_input" placeholder="Name: ">
              <button onclick="socket.emit(\'start_game\', document.getElementById('name_input').value)">Start Game</button>`
  return menu
}

function get_canvas(){
  var canvas = '<canvas id="myCanvas"></canvas>'
  return canvas
}

function get_game_logic(){
  var logic = `
    <script type="text/javascript">
    c = $("#myCanvas")[0]
    c.width = window.innerWidth
    c.height = window.innerHeight
    ctx = c.getContext('2d')

    document.addEventListener('keydown', function(event) {
      if (event.keyCode == "68"){socket.emit('change_input', 0, 0, 1)} //d
      if (event.keyCode == "65"){socket.emit('change_input', 0, 0, -1)} //a
      if (event.keyCode == "87"){socket.emit('change_input', 0, 1, 0)} //w
    }, false)

    document.addEventListener('keyup', function(event) {
      socket.emit('change_input', 0, 0, 0)
    }, false)

    socket.on('update', function(players) {
      ctx.clearRect(0, 0, c.width, c.height)

      var player = players.filter(obj => {
        return obj.id === socket.id
      })

      player = player[0]

      var dx = parseInt(c.width / 2) - player.x
      var dy = parseInt(c.height / 2) - player.y

      for (var i = 0; i < players.length; i++){
        var x = dx + players[i].x
        var y = dy + players[i].y
        if (x >= 0 && x <= c.width && y >= 0 && y <= c.width){
          draw(x, y, players[i].r, players[i].rot)
          display_player_info(players[i], x, y)
        }
      }
    })

    function draw (x, y, r, rot){
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2*Math.PI)
      ctx.stroke()

      ctx.globalAlpha = 0.8
      var path = [[0, 10], [r/2, r/2], [0, -r/2], [-r/2, r/2], [0, 10]]
      ctx.moveTo(x, y)
      ctx.beginPath() 
      for (var i = 0; i < path.length; i++){
        var x1 = x + parseInt(Math.cos(rot) * path[i][0] - Math.sin(rot) * path[i][1])
        var y1 = y + parseInt(Math.sin(rot) * path[i][0] + Math.cos(rot) * path[i][1])
        ctx.lineTo(x1, y1)
      }
      ctx.fill()
    }

    function display_player_info(player, x, y){
      //name
      ctx.globalAlpha = 0.5
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
    </script>`
    
  return logic
}

function change_input (player, vx, vy, rot){
  player.vx += vx
  player.vy += vy
  player.rot += (rot * 0.1)
  return player
}