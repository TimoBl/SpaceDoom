bc = $("#backCanvas")[0]
bc.width = window.innerWidth
bc.height = window.innerHeight
bctx = bc.getContext('2d')

c = $("#myCanvas")[0]
c.width = window.innerWidth
c.height = window.innerHeight
ctx = c.getContext('2d')

sc = $("#shaderCanvas")[0]
sc.width = window.innerWidth
sc.height = window.innerHeight
sctx = sc.getContext('2d')

var bound = {x0: 0, y0: 0, x1: 2000, y1: 1000}
var background_image = new Image()
background_image.src = "static/Background.png"
var asteroids = []
var ast = {x: 400, y: 100, r: 100, ir: 400}
asteroids.push(ast)
var ast = {x: 900, y: 600, r: 60, ir: 200}
asteroids.push(ast)

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
  bctx.clearRect(0, 0, c.width, c.height)
  ctx.clearRect(0, 0, c.width, c.height)
  sctx.clearRect(0, 0, c.width, c.height)

  var player = players.filter(obj => {
    return obj.id === socket.id
  })

  player = player[0]

  var dx = parseInt(c.width / 2) - player.x
  var dy = parseInt(c.height / 2) - player.y

  border = 100

  draw_background(dx, dy, background_image)
  //draw_borders(dx, dy)
  draw_bullets(dx, dy, bullets)
  draw_asteroids(dx, dy, asteroids)

  for (var i = 0; i < players.length; i++){
    var x = dx + players[i].x
    var y = dy + players[i].y
    if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border){
      draw(x, y, players[i].r, players[i].rot, players[i].color)
      display_player_info(players[i], x, y)
      if (players[i].input_t !== 0){
        draw_thrust(x, y, players[i].r, players[i].rot)
      }
      draw_light(x, y, players[i].r, players[i].rot)
    }
  }

  draw_mini_map(players)
  display_player_rank(players)
})

function draw_background(dx, dy, img){
  bctx.fillRect(0, 0, bc.width, bc.height);
  bctx.drawImage(img, dx, dy, bound.x1, bound.y1)
}

function draw_bullets(dx, dy, bullets){
  ctx.fillStyle = "green"
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

function draw_asteroids(dx, dy, asteroids){
  ctx.fillStyle = "#4f2600"

  for (var i = 0; i < asteroids.length; i++){
    ctx.beginPath();
    ctx.arc(dx + asteroids[i].x, dy + asteroids[i].y, asteroids[i].r, 0, 2 * Math.PI);
    ctx.fill()

    ctx.beginPath();
    ctx.arc(dx + asteroids[i].x, dy + asteroids[i].y, asteroids[i].ir, 0, 2 * Math.PI);
    ctx.stroke()
  }
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
  var grad = sctx.createRadialGradient(x,y,0,x,y,1.5*r)
  
  grad.addColorStop(0.002, 'rgba(255, 0, 0, 1.000)');
  grad.addColorStop(0.645, 'rgba(255, 127, 0, 0.6)');
  grad.addColorStop(1.000, 'rgba(255, 246, 0, 0.2)');

  sctx.fillStyle = grad
  sctx.beginPath() 
  var path = [[0, 1.5*r], [-r/4, r/2], [r/4, r/2]]
  for (var i = 0; i < path.length; i++){
    var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
    var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
    sctx.lineTo(x1, y1)
  }
  sctx.fill()
}

function draw_light(x, y, r, rot){
  var grad = sctx.createRadialGradient(x,y,0,x,y,r*6)
  grad.addColorStop(0.0, 'rgba(255, 255, 0, 0.75)');
  grad.addColorStop(1.0, 'rgba(255, 255, 0, 0)');

  sctx.fillStyle = grad
  sctx.globalAlpha = 1.0
  sctx.beginPath()
  var path = [[0, - 3 * r / 4], [-2 * r, -8 * r], [2 * r, -6 * r]]
  for (var i = 0; i < path.length; i++){
    var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
    var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
    sctx.lineTo(x1, y1)
  }
  sctx.fill()
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